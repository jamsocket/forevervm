import WebSocket from 'ws'

export function websocket(url: string, token: string) {
  return new WebSocket(url, { headers: { Authorization: `Bearer ${token}` } })
}
