import { chatClient } from './chatClient'

export async function editMessage(messageId, content) {
  const { data } = await chatClient.patch(`/api/v1/messages/${messageId}`, { content })
  return data
}

export async function deleteMessage(messageId) {
  await chatClient.delete(`/api/v1/messages/${messageId}`)
}
