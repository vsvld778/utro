declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    CMS_ADMIN_EMAIL?: string;
    BUCKET?: R2Bucket;
  }
}
