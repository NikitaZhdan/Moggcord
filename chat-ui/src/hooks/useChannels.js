import { useCallback, useEffect, useState } from 'react'
import { createChannel, joinChannel, leaveChannel, listChannels } from '../api/channels'

export function useChannels() {
  const [channels, setChannels] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listChannels()
      setChannels(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const create = useCallback(
    async (channelName) => {
      const channel = await createChannel(channelName)
      await refresh()
      return channel
    },
    [refresh]
  )

  const join = useCallback(
    async (channelId) => {
      await joinChannel(channelId)
      await refresh()
    },
    [refresh]
  )

  const leave = useCallback(
    async (channelId) => {
      await leaveChannel(channelId)
      await refresh()
    },
    [refresh]
  )

  return { channels, loading, error, refresh, create, join, leave }
}
