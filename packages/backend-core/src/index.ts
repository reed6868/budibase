export * as events from "./events"
export * as migrations from "./migrations"
export * as users from "./users"
export * as roles from "./security/roles"
export * as permissions from "./security/permissions"
export * as accounts from "./accounts"
export * as installation from "./installation"
export * as featureFlags from "./featureFlags"
export * as sessions from "./security/sessions"
export * as platform from "./platform"
export * as auth from "./auth"
export * as constants from "./constants"
export * as logging from "./logging"
export * as middleware from "./middleware"
export * as plugins from "./plugin"
export * as encryption from "./security/encryption"
export * as queue from "./queue"
export * as db from "./db"
export * as context from "./context"
export * as cache from "./cache"
export * as objectStore from "./objectStore"
export * as redis from "./redis"
export * as locks from "./redis/redlock"
export * as utils from "./utils"
export * as errors from "./errors"
export { default as env } from "./environment"

// Add context to tenancy for backwards compatibility
// only do this for external usages to prevent internal
// circular dependencies
import * as context from "./context"
import * as _tenancy from "./tenancy"
export const tenancy = {
  ..._tenancy,
  ...context,
}

// expose error classes directly
export * from "./errors"

// expose constants directly
export * from "./constants"

// expose package init function
import * as db from "./db"
export const init = (opts: any = {}) => {
  db.init(opts.db)
}
