export interface Room {
  _id: string;
  campId: string;
  number: string;
  capacity: number;
  project: string;
  company: string;
  workers: string[];
  availableBeds: number;
}

export interface Worker {
  _id: string;
  name: string;
  surname: string;
  registrationNumber: string;
  project: string;
  roomId: string | { _id: string; number: string; project: string };
  campId: string;
  entryDate: string;
}

export interface Camp {
  _id: string;
  name: string;
  description: string;
  userEmail: string;
  sharedWith?: {
    email: string;
    permission: 'read' | 'write';
  }[];
} 