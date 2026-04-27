import ApiKey from '#models/api_key'

export async function createApiKey(name = 'test') {
  return ApiKey.generate(name)
}

export async function authHeader(name = 'test'): Promise<{ Authorization: string }> {
  const { plaintext } = await ApiKey.generate(name)
  return { Authorization: `Bearer ${plaintext}` }
}
