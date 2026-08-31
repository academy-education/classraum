# R8 — measured, ready, deliberately not in the API 36 release

**2026-09-01.** Play suggested enabling R8. It is currently off
(`minifyEnabled false`). This is what enabling it actually does, measured
rather than estimated, so the follow-up release is a decision and not an
experiment.

## The change

```gradle
release {
    minifyEnabled true
    shrinkResources true
    proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
}
```

## Measured

    without R8   5,284,954 bytes
    with R8      3,344,772 bytes
    saved        1,940,182 bytes  (36.7%)

Build succeeds (`BUILD SUCCESSFUL in 19s`, R8 8.9.32, mapping.txt 8.6 MB,
3,638 mapped entries). `minifyReleaseWithR8` was confirmed to have RUN —
the build was suspiciously fast off a warm cache, and a size drop with no
R8 task would have meant something else entirely.

## The risk, and why it is smaller than it looks

Capacitor instantiates plugins REFLECTIVELY through the JS bridge, which
is exactly what a reachability-based shrinker cannot see. A stripped
plugin does not crash — push notifications simply stop arriving.

`@capacitor/android` ships `consumerProguardFiles 'proguard-rules.pro'`,
keeping `@CapacitorPlugin`-annotated classes, `Plugin` subclasses and
`@PluginMethod` methods. Checked against the actual mapping file:

    PushNotificationsPlugin   KEPT
    SharePlugin               KEPT
    SplashScreenPlugin        KEPT
    StatusBarPlugin           KEPT
    AppPlugin                 KEPT

10 `@CapacitorPlugin` classes preserved under their own names.

## Why it is NOT in the API 36 release

The API 36 upload has a Play deadline attached. R8 does not. Shipping
both together means that if anything misbehaves on a device, there are
two candidate causes and one of them is a compliance fix that cannot be
rolled back without re-breaking compliance.

The static evidence above is strong but it is STATIC. Keeping a class is
not the same as the plugin working end to end, and the failure mode is
silent. Only a device can settle it.

## The one check that settles it

Install an R8 build from internal testing and confirm **a push
notification actually arrives**. That single test covers the whole risk:
it is the plugin most dependent on reflection, the one whose failure is
silent, and the one no compile or mapping file can vouch for.
