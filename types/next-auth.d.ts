declare module "next-auth" {
  interface Session {
    user: {
      name?: string | null
      email?: string | null
      image?: string | null
      login?: string | null // Add GitHub username
    }
    accessToken?: string // Add access token
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    login?: string
    accessToken?: string
  }
}