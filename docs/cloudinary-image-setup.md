# Profile and chat image uploads

Profile photos and chat attachments now use the existing Cloudinary integration. Firebase Authentication remains in use, but Firebase Storage and its Blaze billing upgrade are not needed for these uploads.

## Deployment

1. Commit and push the frontend and backend changes together.
2. Ensure Render has `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` from your existing Cloudinary environment. Keep these credentials on the backend.
3. Redeploy Render, then Vercel. No unsigned upload preset or additional frontend Cloudinary environment variable is needed.
4. `VITE_FIREBASE_STORAGE_BUCKET` is no longer needed for uploads. It may remain in your Firebase web configuration, but it does not enable or require Firebase Storage. All Firebase Authentication settings remain required.
5. Sign in on the deployed site, upload a profile photo, and confirm it remains after refreshing.
6. Send an image in a customer conversation and confirm the bakery account can display it. Check Cloudinary's Media Library if an upload fails.

The `/api/media/images` endpoint verifies Firebase authentication and loads an active backend account before parsing the upload. Chat images require access to an open conversation, and customer restrictions are enforced. The backend accepts PNG, JPEG, and WebP images up to 5 MiB, checks the file signature, and lets Cloudinary decode the image. Cloudinary asset paths use server-controlled account and conversation identifiers.

Images are uploaded as public Cloudinary image assets. Anyone who has an image URL can view it. This matches the existing shared download-URL behavior; it does not provide private, conversation-only image delivery. Old Firebase chat URLs remain supported by the renderer, but their continued availability depends on the original bucket.

Replacing or removing a profile photo changes its displayed URL; it does not delete previous Cloudinary assets. Failed message sends can also leave uploaded assets in Cloudinary. Monitor usage and remove unused assets from the Media Library as needed.
