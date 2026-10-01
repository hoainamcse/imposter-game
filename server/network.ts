import { networkInterfaces } from 'node:os'

export function getLanUrls(port: number) {
  const addresses = Object.values(networkInterfaces())
    .flatMap((entries) => entries ?? [])
    .filter((entry) => entry.family === 'IPv4' && !entry.internal)
    .map((entry) => entry.address)
  return [...new Set(addresses)].map((address) => `http://${address}:${port}`)
}
