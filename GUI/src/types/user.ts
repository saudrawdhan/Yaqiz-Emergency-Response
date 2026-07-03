export type UserRole = 'admin' | 'responder'
export type AgencyType = 'Hospital' | 'Police' | 'Civil Defense' | 'Najm'
export type UserStatus = 'active' | 'disabled'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  agency?: string
  agencyType?: AgencyType
  status?: UserStatus
  lastLogin?: Date
  contactNumber?: string
}

