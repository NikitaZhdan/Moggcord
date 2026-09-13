import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from './AuthContext'
import { useSocketPool } from './SocketPoolContext'
import { ICE_SERVERS } from '../rtc/iceServers'

const CallContext = createContext(null)

// ---------------------------------------------------------------------------
// Модель звонка на фронте
// ---------------------------------------------------------------------------
// activeCall — единственный источник правды для UI:
//   { channelId, callId, callType, status, initiatorId, participants, remoteStreams }
//   status: 'outgoing' | 'incoming' | 'active' | 'ended'
//
// peersRef — источник правды для WebRTC (НЕ хранится в React state, потому что
// RTCPeerConnection — это императивный, живущий вне рендеров объект; смешивать
// его с состоянием React — верный способ поймать гонки и утечки соединений).
// Синхронизация с UI идёт в одну сторону: peersRef меняется первым,
// activeCall.remoteStreams обновляется вслед за ним через setActiveCall.
//
// Кто кому шлёт SDP offer, чтобы не было двойного оффера в паре: сторона с
// лексикографически меньшим user_id всегда инициирует offer, другая только
// отвечает. Правило работает одинаково для 1:1 и для полного mesh в группе —
// каждая пара участников договаривается независимо от остальных пар.
// ---------------------------------------------------------------------------

export function CallProvider({ channels, children }) {
  const { user } = useAuth()
  const myId = user?.uuid
  const pool = useSocketPool()

  const [activeCall, setActiveCall] = useState(null)
  const activeCallRef = useRef(null)
  activeCallRef.current = activeCall

  const localStreamRef = useRef(null)
  const peersRef = useRef(new Map()) // remoteUserId -> RTCPeerConnection
  const pendingCandidatesRef = useRef(new Map()) // remoteUserId -> RTCIceCandidateInit[]

  // Держим сокеты открытыми для ВСЕХ каналов пользователя (не только выбранного
  // в UI) — иначе входящий звонок в неоткрытый канал просто не долетит.
  useEffect(() => {
    pool.ensureChannels(channels.map((c) => c.id))
  }, [channels, pool])

  const send = useCallback(
    (channelId, payload) => pool.send(channelId, payload),
    [pool]
  )

  // -- Управление медиапотоками -------------------------------------------

  const getLocalStream = useCallback(async (callType) => {
    if (localStreamRef.current) return localStreamRef.current
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: callType === 'video',
    })
    localStreamRef.current = stream
    return stream
  }, [])

  const stopLocalStream = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((track) => track.stop())
    localStreamRef.current = null
  }, [])

  // -- Управление WebRTC-соединениями с конкретным собеседником -----------

  const closePeer = useCallback((remoteUserId) => {
    const pc = peersRef.current.get(remoteUserId)
    if (pc) {
      pc.close()
      peersRef.current.delete(remoteUserId)
    }
    pendingCandidatesRef.current.delete(remoteUserId)
    setActiveCall((prev) => {
      if (!prev) return prev
      const remoteStreams = new Map(prev.remoteStreams)
      remoteStreams.delete(remoteUserId)
      return { ...prev, remoteStreams }
    })
  }, [])

  const closeAllPeers = useCallback(() => {
    peersRef.current.forEach((pc) => pc.close())
    peersRef.current.clear()
    pendingCandidatesRef.current.clear()
  }, [])

  const ensurePeerConnection = useCallback(
    (remoteUserId, channelId) => {
      const existing = peersRef.current.get(remoteUserId)
      if (existing) return existing

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
      const localStream = localStreamRef.current
      localStream?.getTracks().forEach((track) => pc.addTrack(track, localStream))

      pc.ontrack = (event) => {
        const [stream] = event.streams
        setActiveCall((prev) => {
          if (!prev) return prev
          const remoteStreams = new Map(prev.remoteStreams)
          remoteStreams.set(remoteUserId, stream)
          return { ...prev, remoteStreams }
        })
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          send(channelId, {
            type: 'webrtc.ice-candidate',
            target_user_id: remoteUserId,
            candidate: event.candidate.toJSON(),
          })
        }
      }

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          closePeer(remoteUserId)
        }
      }

      peersRef.current.set(remoteUserId, pc)
      return pc
    },
    [send, closePeer]
  )

  const offerTo = useCallback(
    async (remoteUserId, channelId) => {
      const pc = ensurePeerConnection(remoteUserId, channelId)
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      send(channelId, { type: 'webrtc.offer', target_user_id: remoteUserId, sdp: pc.localDescription })
    },
    [ensurePeerConnection, send]
  )

  const flushPendingCandidates = useCallback(async (remoteUserId) => {
    const pc = peersRef.current.get(remoteUserId)
    const queued = pendingCandidatesRef.current.get(remoteUserId)
    if (!pc || !queued?.length) return
    pendingCandidatesRef.current.set(remoteUserId, [])
    for (const candidate of queued) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate))
      } catch {
        // Кандидат мог устареть (например, соединение уже перезапустилось) — не критично.
      }
    }
  }, [])

  // Сверяет список активных участников звонка (из события бэкенда) с тем, с
  // кем у нас реально сейчас есть WebRTC-соединение, и приводит второе к
  // первому: открывает недостающие связи, закрывает связи с вышедшими.
  const reconcilePeers = useCallback(
    (channelId, participants) => {
      if (!myId) return
      const activeIds = new Set(
        participants.filter((p) => p.joined_at && !p.left_at && p.user_id !== myId).map((p) => p.user_id)
      )

      for (const remoteId of activeIds) {
        if (peersRef.current.has(remoteId)) continue
        ensurePeerConnection(remoteId, channelId)
        if (myId < remoteId) {
          offerTo(remoteId, channelId)
        }
        // Если remoteId < myId — ничего не делаем, ждём от него offer.
      }

      for (const remoteId of Array.from(peersRef.current.keys())) {
        if (!activeIds.has(remoteId)) closePeer(remoteId)
      }
    },
    [myId, ensurePeerConnection, offerTo, closePeer]
  )

  // -- Публичные действия для UI -------------------------------------------

  const resetCall = useCallback(() => {
    closeAllPeers()
    stopLocalStream()
    setActiveCall(null)
  }, [closeAllPeers, stopLocalStream])

  const startCall = useCallback(
    async (channelId, callType = 'audio') => {
      if (activeCallRef.current) return // уже в звонке — сначала завершите текущий
      await getLocalStream(callType)
      setActiveCall({
        channelId,
        callId: null,
        callType,
        status: 'outgoing',
        initiatorId: myId,
        participants: [],
        remoteStreams: new Map(),
      })
      send(channelId, { type: 'call.invite', call_type: callType })
    },
    [getLocalStream, myId, send]
  )

  const acceptCall = useCallback(async () => {
    const call = activeCallRef.current
    if (!call || call.status !== 'incoming') return
    await getLocalStream(call.callType)
    // Локальный стрим готов до прихода call.accepted с сервера — форсируем
    // ре-рендер, чтобы превью своей камеры показалось сразу, а не после round-trip.
    setActiveCall((prev) => (prev ? { ...prev } : prev))
    send(call.channelId, { type: 'call.accept', call_id: call.callId })
  }, [getLocalStream, send])

  const declineCall = useCallback(() => {
    const call = activeCallRef.current
    if (!call) return
    send(call.channelId, { type: 'call.decline', call_id: call.callId })
    resetCall()
  }, [send, resetCall])

  const hangUp = useCallback(() => {
    const call = activeCallRef.current
    if (!call) return
    send(call.channelId, { type: 'call.leave', call_id: call.callId })
    resetCall()
  }, [send, resetCall])

  // -- Обработка событий call.* / webrtc.* с сокетов всех каналов ----------

  const handleChannelEvent = useCallback(
    (channelId, payload) => {
      switch (payload.type) {
        case 'call.created': {
          // Ack на наш же call.invite — проставляем полученный call_id.
          setActiveCall((prev) =>
            prev && prev.channelId === channelId && prev.status === 'outgoing' && !prev.callId
              ? { ...prev, callId: payload.call.id, participants: payload.call.participants }
              : prev
          )
          break
        }

        case 'call.incoming': {
          if (activeCallRef.current) {
            // Уже в звонке (или звоним сами) — сигнализируем "занято" сразу,
            // не заставляя того, кто звонит, ждать таймаута.
            send(channelId, { type: 'call.decline', call_id: payload.call.id })
            break
          }
          setActiveCall({
            channelId,
            callId: payload.call.id,
            callType: payload.call.call_type,
            status: 'incoming',
            initiatorId: payload.call.initiator_id,
            participants: payload.call.participants,
            remoteStreams: new Map(),
          })
          break
        }

        case 'call.accepted': {
          const call = activeCallRef.current
          if (!call || call.callId !== payload.call.id) break
          setActiveCall((prev) => ({ ...prev, status: 'active', participants: payload.call.participants }))
          reconcilePeers(channelId, payload.call.participants)
          break
        }

        case 'call.left': {
          const call = activeCallRef.current
          if (!call || call.callId !== payload.call.id) break
          setActiveCall((prev) => ({ ...prev, participants: payload.call.participants }))
          reconcilePeers(channelId, payload.call.participants)
          break
        }

        case 'call.ended': {
          const call = activeCallRef.current
          if (!call || call.callId !== payload.call.id) break
          resetCall()
          break
        }

        case 'webrtc.offer': {
          handleOffer(channelId, payload)
          break
        }
        case 'webrtc.answer': {
          handleAnswer(payload)
          break
        }
        case 'webrtc.ice-candidate': {
          handleIceCandidate(payload)
          break
        }

        default:
          break
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reconcilePeers, resetCall, send]
  )

  const handleOffer = useCallback(
    async (channelId, payload) => {
      const remoteUserId = payload.from_user_id
      const pc = ensurePeerConnection(remoteUserId, channelId)
      await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp))
      await flushPendingCandidates(remoteUserId)
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      send(channelId, { type: 'webrtc.answer', target_user_id: remoteUserId, sdp: pc.localDescription })
    },
    [ensurePeerConnection, flushPendingCandidates, send]
  )

  const handleAnswer = useCallback(
    async (payload) => {
      const pc = peersRef.current.get(payload.from_user_id)
      if (!pc) return
      await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp))
      await flushPendingCandidates(payload.from_user_id)
    },
    [flushPendingCandidates]
  )

  const handleIceCandidate = useCallback((payload) => {
    const remoteUserId = payload.from_user_id
    const pc = peersRef.current.get(remoteUserId)
    if (!pc || !pc.remoteDescription) {
      // Кандидат прилетел раньше offer/answer — придержим до setRemoteDescription.
      const queue = pendingCandidatesRef.current.get(remoteUserId) || []
      queue.push(payload.candidate)
      pendingCandidatesRef.current.set(remoteUserId, queue)
      return
    }
    pc.addIceCandidate(new RTCIceCandidate(payload.candidate)).catch(() => {})
  }, [])

  // Подписка на события каждого известного канала — именно поэтому пул
  // сокетов общий: без него пришлось бы держать N собственных соединений.
  useEffect(() => {
    const unsubscribes = channels.map((channel) =>
      pool.subscribe(channel.id, {
        onMessage: (payload) => handleChannelEvent(channel.id, payload),
      })
    )
    return () => unsubscribes.forEach((unsub) => unsub())
  }, [channels, pool, handleChannelEvent])

  const value = useMemo(
    () => ({
      activeCall,
      startCall,
      acceptCall,
      declineCall,
      hangUp,
      channels,
      getMyStream: () => localStreamRef.current,
    }),
    [activeCall, startCall, acceptCall, declineCall, hangUp, channels]
  )

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>
}

export function useCall() {
  const ctx = useContext(CallContext)
  if (!ctx) throw new Error('useCall должен использоваться внутри <CallProvider>')
  return ctx
}
