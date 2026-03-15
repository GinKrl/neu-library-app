import { Timestamp } from 'firebase/firestore';

// Collection: 'users'
export interface User {
  uid: string;                 // Matches the Firebase Auth UID
  email: string;               // e.g., student@neu.edu.ph
  displayName: string;
  role: 'admin' | 'user';      // Role-based access control
  college: string;             // e.g., "College of CS"
  isBlocked: boolean;          // Admin toggle to restrict access
  createdAt: Timestamp;
}

// Collection: 'visits'
export interface Visit {
  id?: string;                 // Firestore auto-generated document ID
  userId: string;              // Reference to the user's UID
  email: string;               // Helpful for quick Admin dashboard searches
  timestamp: Timestamp;        // Server timestamp of check-in
  purposeOfVisit: string;      // e.g., 'Study', 'Research'
  college: string;             // Duplicated here for easier analytics/filtering
}

// Collection: 'colleges'
export interface College {
  id?: string;                 // Firestore auto-generated document ID
  name: string;                // e.g., "College of Nursing"
}