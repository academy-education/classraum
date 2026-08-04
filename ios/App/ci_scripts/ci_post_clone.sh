#!/bin/sh
#
# Xcode Cloud post-clone hook.
#
# ── Why this file has to exist ───────────────────────────────────────
# Every iOS build recorded on `main` has FAILED — there is no green
# build in the last 45 commits. The cause is not a code regression; the
# project Xcode Cloud clones cannot build at all.
#
# Podfile declares 12 pods, and every one resolves through node_modules:
#
#     pod 'Capacitor', :path => '../../node_modules/@capacitor/ios'
#
# A fresh clone has no node_modules, and `ios/App/Pods` is gitignored
# (0 tracked files). Xcode Cloud builds App.xcworkspace, which needs the
# Pods project. So the build fails before it compiles a line of Swift.
# It works on a developer machine only because npm and pod install have
# already been run there.
#
# Xcode Cloud runs this script automatically after cloning, from this
# directory. It is the only hook where those artifacts can be created.
#
# ── What this does NOT do, deliberately ──────────────────────────────
# It does not run `npm run build`. The app is a THIN SHELL: capacitor
# config sets `server.url = https://app.classraum.com`, so the native
# app loads the deployed web app at runtime and ships no bundled site.
# `webDir: 'out'` is a declared fallback that is not used, and `out/` is
# gitignored. Verified rather than assumed — with `out/` removed,
# `npx cap copy ios` exits 0 and prints:
#
#     Web asset directory specified by webDir does not exist.
#     This is not an error because server.url is set in config.
#
# Running `next build` here would add minutes to every CI run and change
# nothing about the produced .ipa.
#
set -e

echo "--- ci_post_clone: repo=$CI_PRIMARY_REPOSITORY_PATH"
cd "$CI_PRIMARY_REPOSITORY_PATH"

# Node. Xcode Cloud images do not ship it. package.json needs >=18.17.
if ! command -v node > /dev/null 2>&1; then
  echo "--- installing node"
  brew install node@20
  # Homebrew keg-only formulae are not linked onto PATH automatically.
  export PATH="/opt/homebrew/opt/node@20/bin:/usr/local/opt/node@20/bin:$PATH"
fi
echo "--- node $(node --version), npm $(npm --version)"

# `npm ci` (not `npm install`) so the build uses the committed lockfile
# exactly. A CI run that silently resolves different dependency versions
# than the ones tested is not a check.
echo "--- npm ci"
npm ci

# CocoaPods is not guaranteed on the image either.
if ! command -v pod > /dev/null 2>&1; then
  echo "--- installing cocoapods"
  brew install cocoapods
fi
echo "--- $(pod --version)"

# `cap sync ios` = copy + update:
#   copy   → writes ios/App/App/capacitor.config.json and the cordova
#            shims into App/public (all gitignored, all required)
#   update → runs `pod install`, which materialises the Pods project the
#            workspace references
echo "--- npx cap sync ios"
npx cap sync ios

# Fail loudly here rather than letting xcodebuild fail with a confusing
# missing-module error further along. If Pods did not materialise, the
# rest of the build is guaranteed to fail and the reason is this.
if [ ! -d "ios/App/Pods" ]; then
  echo "!!! ios/App/Pods was not created — pod install did not run"
  exit 1
fi

echo "--- ci_post_clone: ok ($(ls ios/App/Pods | wc -l | tr -d ' ') entries in Pods)"
