/**
 * Thin re-export of the PortOne v2 browser SDK so the subscription
 * page (and any future study purchases) call it through a single
 * import path. Lets us swap the implementation later (e.g. wrap with
 * telemetry) without churning the call sites.
 */

import * as PortOneSDK from '@portone/browser-sdk/v2'

export const PortOne = PortOneSDK
export type { IssueBillingKeyResponse } from '@portone/browser-sdk/v2'
