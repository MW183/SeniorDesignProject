export interface User {
  id: string;
  email: string;
  role: 'ADMIN' | 'CLIENT' | 'USER';
  firstName?: string;
  lastName?: string;
  createdAt?: string;
  updatedAt?: string;
}
