import { chatClient } from './chatClient'

export async function listChannels() {
  const { data } = await chatClient.get('/api/v1/channels/')
  return data
}

export async function createChannel(channelName) {
  const { data } = await chatClient.post('/api/v1/channels/', {
    channel_name: channelName,
  })
  return data
}

export async function joinChannel(channelId) {
  await chatClient.post(`/api/v1/channels/${channelId}/join`)
}

export async function leaveChannel(channelId) {
  await chatClient.post(`/api/v1/channels/${channelId}/leave`)
}

export async function getChannelMessages(channelId, { limit = 50, before } = {}) {
  const params = { limit }
  if (before) params.before = before
  const { data } = await chatClient.get(`/api/v1/channels/${channelId}/messages`, { params })
  return data
}
