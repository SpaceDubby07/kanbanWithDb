// schemaTypes.ts

// Core user fields (from users table)
export type User = {
  id: number;
  username: string;
  email: string;
  password: string; // hashed
  role: 'user' | 'admin';
  isActive: boolean;
  isVerified: boolean;
  isOnboarded: boolean;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
};

// Profile fields (from user_profiles table)
export type UserProfile = {
  id: number;
  userId: number;
  displayName: string;
  bio: string | null;
  locationId: number | null;
  genderId: number | null;
  religionId: number | null;
  preferencesId: number | null;
  pronounsId: number | null;
  dateOfBirth: string | null;
  profileImageUrl: string | null;
  coverImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

// Extended profile with lookup names (used in /api/auth/me and profile pages)
export interface UserProfileWithNames extends UserProfile {
  locationName?: string | null;
  genderName?: string | null;
  religionName?: string | null;
  pronounsName?: string | null;
  preferencesName?: string | null;
  // Optional: if you later add tags to /me response
  tags?: { id: number; name: string }[];
}

// Full user with profile (for context where both are joined)
export type FullUser = User & {
  profile: UserProfileWithNames | null;
};

// Lookup types (used in dropdowns and /api/lookups)
export type Location = {
  id: number;
  countyName: string;
};

export type Gender = {
  id: number;
  gender: string;
};

export type Religion = {
  id: number;
  religion: string;
};

export type Pronoun = {
  id: number;
  label: string;
};

export type RelationshipPreference = {
  id: number;
  label: string;
  createdAt: string | null;
};

// Tag types
export type Tag = {
  id: number;
  name: string;
  createdAt: string;
};

export type UserTag = {
  userId: number;
  tagId: number;
  createdAt: string;
};

// User image type
export type UserImage = {
  id: number;
  userId: number;
  imageUrl: string | null;
  publicId: string | null;
  isPrimary: boolean;
  createdAt: string;
};

// Other types (kept as-is, but with minor refinements)
export type UserLike = {
  id: number;
  senderId: number;
  receiverId: number;
  createdAt: string;
};

export type Match = {
  id: number;
  userAId: number;
  userBId: number;
  createdAt: string;
};

export type UserStatus = {
  id: number;
  userId: number;
  status: string;
  createdAt: string;
  expiresAt: string | null;
};

export type UserReport = {
  id: number;
  reporterId: number;
  reportedUserId: number;
  reason: string;
  context: string | null;
  status: 'pending' | 'reviewed' | 'dismissed' | 'actioned';
  handledByAdminId: number | null;
  createdAt: string;
  updatedAt: string;
};
