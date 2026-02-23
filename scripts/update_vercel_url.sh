#!/bin/bash
npx vercel env add NEXT_PUBLIC_SITE_URL production <<INNER_EOF
https://manager.swim-partners.com
INNER_EOF
