# Security headers for the client (single-page app).
# Included in the server block AND in every location that sets its own
# add_header — nginx drops inherited add_header directives the moment a
# nested block adds any of its own, so keep this in sync everywhere it's used.
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
add_header X-Frame-Options            "SAMEORIGIN"                                   always;
add_header X-Content-Type-Options     "nosniff"                                      always;
add_header Referrer-Policy            "strict-origin-when-cross-origin"              always;
add_header Permissions-Policy         "camera=(), microphone=(), geolocation=(self), payment=()" always;
add_header Content-Security-Policy    "default-src 'self'; script-src 'self' 'unsafe-inline' https://accounts.google.com https://apis.google.com https://cdnjs.cloudflare.com https://unpkg.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https://res.cloudinary.com https:; connect-src 'self' https://api.cloudinary.com https://accounts.google.com; frame-src https://accounts.google.com; object-src 'none'; base-uri 'self'; form-action 'self';" always;
