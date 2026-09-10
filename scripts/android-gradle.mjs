#!/usr/bin/env node
/**
 * Run an Android Gradle task with a JDK that AGP can actually use.
 *
 *   node scripts/android-gradle.mjs assembleDebug
 *   npm run android:build
 *
 * WHY THIS EXISTS. On 2026-09-10 `./gradlew assembleDebug` failed on a clean
 * checkout with:
 *
 *   Execution failed for JdkImageTransform: .../core-for-system-modules.jar
 *   Error while executing process .../bin/jlink
 *
 * which reads like a corrupt Android SDK and is not. The only JDK installed
 * was 26; Android Gradle Plugin 8.9.1 supports 17 and 21, and its jlink step
 * fails on anything newer. Nothing in the project was wrong.
 *
 * The obvious fix — `org.gradle.java.home` in android/gradle.properties — is
 * a machine-specific absolute path in a TRACKED file, so it breaks the next
 * person on an Intel Mac (/usr/local) or Linux. And Gradle 8.11 has no
 * portable way to pin the DAEMON's JVM (toolchains only cover compilation).
 * So: find a supported JDK at run time, and say plainly what to install when
 * there isn't one.
 *
 * Homebrew's openjdk@N is keg-only, so /usr/libexec/java_home does not list
 * it — that is why the Homebrew prefixes are searched explicitly rather than
 * relying on java_home alone.
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { join } from 'node:path'

/** AGP 8.9 supports these, newest first. */
const SUPPORTED = [21, 17]

/**
 * The major version a JDK at `home` actually reports, or null.
 *
 * spawnSync, not execFileSync: `java -version` writes to STDERR, so reading
 * only stdout returns an empty string and every JDK looks unusable. Both
 * streams are read here and `--version` is preferred, which does go to
 * stdout on JDK 9+.
 */
function majorOf(home) {
  const bin = join(home, 'bin', 'java')
  const r = spawnSync(bin, ['-version'], { encoding: 'utf8' })
  if (r.error || r.status !== 0) return null
  const out = `${r.stdout ?? ''}${r.stderr ?? ''}`
  // openjdk version "17.0.18"  |  openjdk version "21" | java version "1.8.0"
  const m = out.match(/version "(?:1\.)?(\d+)/)
  return m ? Number(m[1]) : null
}

function fromJavaHomeTool(major) {
  if (process.platform !== 'darwin') return null
  try {
    const p = execFileSync('/usr/libexec/java_home', ['-v', String(major)], {
      stdio: ['ignore', 'pipe', 'ignore'],
    }).toString().trim()
    // `java_home -v 21` matches "21 OR LATER" and happily returns a JDK 26 --
    // which is the exact version AGP cannot use. Ask the JDK itself.
    return p && majorOf(p) === major ? p : null
  } catch {
    return null
  }
}

function fromHomebrew(major) {
  // Apple Silicon, then Intel.
  for (const prefix of ['/opt/homebrew/opt', '/usr/local/opt']) {
    const p = join(prefix, `openjdk@${major}`)
    if (majorOf(p) === major) return p
    // Some formulae install a nested libexec/openjdk.jdk layout.
    const nested = join(p, 'libexec', 'openjdk.jdk', 'Contents', 'Home')
    if (majorOf(nested) === major) return nested
  }
  return null
}

function fromSdkman(major) {
  const p = join(process.env.HOME ?? '', '.sdkman', 'candidates', 'java', 'current')
  return majorOf(p) === major ? p : null
}

function findJdk() {
  for (const major of SUPPORTED) {
    for (const probe of [fromJavaHomeTool, fromHomebrew, fromSdkman]) {
      const home = probe(major)
      if (home) return { home, major }
    }
  }
  return null
}

const task = process.argv.slice(2)
if (task.length === 0) {
  console.error('usage: node scripts/android-gradle.mjs <gradle task> [...]')
  process.exit(2)
}

const jdk = findJdk()
if (!jdk) {
  console.error(
    `No JDK that Android Gradle Plugin 8.9 can use (needs ${SUPPORTED.join(' or ')}).\n\n` +
    `  brew install openjdk@21\n\n` +
    'Checked /usr/libexec/java_home, /opt/homebrew/opt, /usr/local/opt and SDKMAN.\n' +
    'A newer JDK will NOT work: AGP\'s jlink step fails on it, and the error it\n' +
    'prints ("JdkImageTransform ... core-for-system-modules.jar") looks like a\n' +
    'broken Android SDK rather than a JDK version problem.'
  )
  process.exit(1)
}

console.log(`Using JDK ${jdk.major} — ${jdk.home}`)

const res = spawnSync('./gradlew', [...task, '--console=plain'], {
  cwd: new URL('../android/', import.meta.url).pathname,
  stdio: 'inherit',
  env: {
    ...process.env,
    JAVA_HOME: jdk.home,
    // CocoaPods is not involved here, but Gradle inherits the same terminal
    // encoding problem on a non-UTF-8 locale.
    LANG: process.env.LANG ?? 'en_US.UTF-8',
  },
})
process.exit(res.status ?? 1)
