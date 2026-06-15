export interface Admin {
  id: string
  username: string
  password_hash: string
  created_at: string
}

export interface Room {
  id: string
  name: string
  created_at: string
}

export interface Teacher {
  id: string
  name: string
  username: string
  password_hash: string
  room_id: string | null
  active: boolean
  created_at: string
  room?: Room
}

export interface Student {
  id: string
  name: string
  gender: 'male' | 'female'
  pin_hash: string
  active: boolean
  created_at: string
}

export interface Checkout {
  id: string
  student_id: string
  room_id: string
  teacher_id: string
  location: string
  check_out_time: string
  check_in_time: string | null
  duration_minutes: number | null
  is_checked_out: boolean
  created_at: string
  student?: Student
  teacher?: Teacher
  room?: Room
}

export interface Settings {
  [key: string]: string
}

export interface Session {
  id: string
  token: string
  user_type: 'admin' | 'teacher'
  user_id: string
  expires_at: string
}

export interface AuthState {
  isAuthenticated: boolean
  userType: 'admin' | 'teacher' | null
  userId: string | null
  userName: string | null
  token: string | null
}
