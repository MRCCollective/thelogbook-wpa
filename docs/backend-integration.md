# Backend integration plan

This document records preparation only. The PWA currently uses local demo data. No KEKS API or database code was changed.

## What already exists in KEKS

- KEKS.Web configures Swagger/OpenAPI for its v1 API in `Program.cs`.
- `GET /api/v1/Activities` and `POST /api/v1/Activities` exist in `Areas/ApiV1/Controllers/ActivitiesController.cs`.
- Operations are separate existing entities: groups, drop-ins, closed groups and outreaches. Their API controllers already exist.
- Those v1 API controllers require the `apiKey` authentication scheme, using `X-API-Key` and optionally `X-Organization-Id`. KEKS's normal web sign-in uses browser authentication cookies.
- The existing activity API model has more fields than this first-screen form, including operation IDs, start/end, activity types, participant breakdown and produced hours. The web app also contains more activity-specific business rules.

## Work needed before live integration

1. Agree on a small activity creation use case in .NET. The backend should validate permissions and operation membership, apply the same business rules as the existing web app, and decide which fields may be defaulted or must appear in the mobile form. Do not duplicate those rules in TypeScript.
2. Provide authenticated endpoints for current user/organization, available operations, activity list and activity creation. Keep operation creation out of the PWA client. Return only operations the signed-in user may use.
3. Agree on browser and future native authentication. For a browser PWA, a same-origin or backend-for-frontend flow using the existing login and secure HttpOnly cookies is a candidate. Protect writes against CSRF. For SwiftUI later, use an appropriate user authorization flow such as OAuth/OIDC Authorization Code with PKCE, if supported by the chosen identity provider. Do not put an organization API key in browser or native app code.
4. Expose the implemented contract in KEKS's generated OpenAPI document. Generate TypeScript (and later Swift) types or check clients against that contract. The proposed `openapi/pwa-v1.yaml` here is a discussion draft until the backend implements it.
5. Replace `src/data/demo.ts` with a real repository; handle loading, errors, expired sessions and organization switching. Keep the screens and their data types aligned with the approved API.

## Decisions still needed

- Which existing activity kinds can the first form create, and which fields are mandatory for each kind?
- Is an activity with zero participants a valid planned activity in every operation?
- Does the first release need multi-organization switching, BankID, SSO or both?
- Which activity data can be cached offline? This prototype caches the app shell only.
