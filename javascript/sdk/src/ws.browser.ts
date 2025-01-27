export function websocket(url: string, token: string) {
  return new WebSocket(url + `?_forevervm_jwt=${token}`)
}
