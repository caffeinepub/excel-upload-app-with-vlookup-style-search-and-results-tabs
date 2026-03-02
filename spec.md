# Specification

## Summary
**Goal:** Fix user profile display names and avatars so they fully persist across sessions and canister upgrades in Crystal Atlas Teams.

**Planned changes:**
- Store user profile data (displayName, profilePicture) in stable backend storage so it survives canister upgrades and session logouts
- Ensure the `getUserProfile` backend call consistently returns saved display names and avatars for the authenticated principal
- Run a migration to convert any legacy profile entries (using `name`) to the new schema with `displayName`, preserving existing values
- Update `useUserProfile` hook and `ProfileEditorDialog` to correctly read from and write to the backend
- After saving changes, immediately reflect updated display name and avatar in the sidebar and message feed without a hard refresh
- On login, populate the UI with profile data fetched from the backend

**User-visible outcome:** Users who set a display name or upload a profile picture will see their saved profile consistently after logging out and back in, and their avatar will appear correctly in the message feed and sidebar without needing to re-enter any information.
