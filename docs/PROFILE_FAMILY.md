# Profile & Family — Production Milestone

Chronicle’s Profile module is the single identity, ownership, and personalization foundation. All profile access flows through the bottom navigation tab.

## Screen hierarchy

```
/profile                              Apple ID-style account hub
├── /profile/personal                 Identity & regional preferences
├── /profile/family                   Family roster, search, invitations
│   ├── /family/members/new           Add member (legacy path retained)
│   ├── /family/members/:id           Member detail
│   └── /family/members/:id/edit      Edit member
├── /profile/connections              Connected services list
│   └── /profile/connections/drive    Google Drive connection management
├── /profile/preferences              Default member, AI style, display format
└── /profile/security                 Auth status, data reset, sign out
```

**Redirects (backward compatibility)**

| Legacy route                 | Redirects to                 |
| ---------------------------- | ---------------------------- |
| `/settings`                  | `/profile`                   |
| `/settings/account`          | `/profile/personal`          |
| `/settings/preferences`      | `/profile/preferences`       |
| `/settings/data`             | `/profile/security`          |
| `/settings/connectors/drive` | `/profile/connections/drive` |
| `/connectors/google-drive`   | `/profile/connections/drive` |
| `/integrations`              | `/profile/connections`       |
| `/family`                    | `/profile/family`            |

## Components created

| Component                            | Path                                                                |
| ------------------------------------ | ------------------------------------------------------------------- |
| `ProfilePageShell`                   | `src/ui/figma/profile/profile-ui.tsx`                               |
| `ProfileAvatar`                      | `src/ui/figma/profile/profile-ui.tsx`                               |
| `ProfileSectionCard`                 | `src/ui/figma/profile/profile-ui.tsx`                               |
| `ProfileNavRow`                      | `src/ui/figma/profile/profile-ui.tsx`                               |
| `ProfileStatTile`                    | `src/ui/figma/profile/profile-ui.tsx`                               |
| `ProfileConnectionChip`              | `src/ui/figma/profile/profile-ui.tsx`                               |
| `ProfileSearchField`                 | `src/ui/figma/profile/profile-ui.tsx`                               |
| `FigmaProfileScreen` (rewritten hub) | `src/ui/figma/screens/FigmaProfileScreen.tsx`                       |
| `FigmaProfileConnectionsScreen`      | `src/ui/figma/profile/FigmaProfileConnectionsScreen.tsx`            |
| `FigmaProfileDriveScreen`            | `src/ui/figma/profile/FigmaProfileDriveScreen.tsx`                  |
| `FigmaProfileSecurityScreen`         | `src/ui/figma/profile/FigmaProfileSecurityScreen.tsx`               |
| Page wrappers                        | `ProfileConnectionsPage`, `ProfileDrivePage`, `ProfileSecurityPage` |

## Components / entry points removed

| Change                                               | Location                                                                                   |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Profile avatar button removed                        | `HealthLayout.tsx`                                                                         |
| Home “Manage” now opens Family (not Profile hub)     | `FigmaHomeScreen.tsx`                                                                      |
| Google Drive file browser removed from profile flow  | Drive connection uses `FigmaProfileDriveScreen` instead of full `GoogleDriveConnectorPage` |
| `/integrations` standalone page replaced by redirect | `router.tsx`                                                                               |

`GoogleDriveConnectorPage` and `IntegrationsPage` remain in the codebase for reference but are no longer primary routes.

## Data already connected

| Surface                          | Source                                          |
| -------------------------------- | ----------------------------------------------- |
| Display name, avatar, email      | `useUser`, `useAuth`                            |
| Family role                      | `useFamilyContext` → `currentUserMember.roleId` |
| Member since                     | `user.created_at`                               |
| Health report count              | `useMemberHealthReports`                        |
| Document count                   | `useMemberDocuments`                            |
| Family members                   | `useFamilyContext`                              |
| Google Drive status, email, sync | `useGoogleDriveConnector`                       |
| Family search                    | Client filter on `members`                      |
| Display name save                | Supabase `auth.updateUser`                      |
| Preferences (member, AI style)   | `usePersonalPreferences`, `useFamilyContext`    |
| Health data reset                | `resetAllImportedHealthData`                    |
| Sign out                         | `useAuth().signOut`                             |

## Placeholder areas (hidden until enabled)

- **Personal:** phone, date of birth, emergency contact, editable language/timezone
- **Connections:** Google Calendar, email, wearables (copy-only “coming soon” note)
- **Security:** passkeys, multi-device sessions
- **Family member detail:** `FUTURE_MODULE_PLACEHOLDERS` — Finance, Insurance, Travel ownership cards only render when `available: true`
- **Preferences:** theme, notifications, units, date format, privacy/search prefs (not exposed yet)

## Remaining improvements

1. **Persist personal fields** — phone, DOB, emergency contact, language, timezone in Supabase profile table
2. **Profile photo upload** — wire avatar change (Google avatar is read today)
3. **Family member detail polish** — migrate `FamilyMemberDetailPage` from Health subpage shell to `ProfilePageShell`
4. **Recent activity feed** on profile hub — aggregate timeline events from health/documents
5. **Notification & appearance settings** — fold into Preferences or expose when implemented
6. **Google Drive dev browser** — keep `GoogleDriveConnectorPage` linked from dev-only Health debug if needed
7. **Member-scoped search** — documents and health records by owner (future)
8. **Family invitations UX** — inline invite flow on family screen
9. **Archive/remove member** — surface existing backend actions in member detail
10. **Active member switcher** — quick switch from profile hub without opening Preferences
