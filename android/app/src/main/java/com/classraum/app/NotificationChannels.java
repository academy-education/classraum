package com.classraum.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.os.Build;

/**
 * Declares the app's Android notification channels.
 *
 * Since Android 8 (API 26) EVERY notification must name a channel. Before
 * this class existed the app declared none, so all 13 push kinds
 * (src/lib/study/push.ts) landed in one system-generated bucket and the
 * only control a user had was "Classraum: off" — which silences a failed
 * payment along with a streak nudge.
 *
 * The ids below are the contract with the server: they MUST stay equal to
 * the category ids in src/lib/study/push-categories.ts, because the sender
 * targets them via FCM's android.notification.channel_id. Renaming an id
 * here without renaming it there does not error — the message just falls
 * back to the manifest's default_notification_channel_id and the user's
 * per-category choice is silently ignored.
 *
 * IMPORTANT — what people get wrong when they later want to adjust these:
 *
 *   createNotificationChannel() on an id that already exists is a no-op
 *   for everything the user can control (importance, sound, vibration,
 *   lights, badge). It is NOT an update. Once the channel has been
 *   created on a device, passing a different IMPORTANCE_* here changes
 *   nothing for any user who has already run the app — by design, so an
 *   app cannot un-mute itself after a user turns it down.
 *
 *   Only name and description are refreshed on re-creation (and the
 *   importance may still be LOWERED by the system, never raised).
 *
 *   So to genuinely change a channel's importance you must ship a NEW
 *   channel id and delete the old one with deleteNotificationChannel().
 *   Note that a deleted id's settings are remembered by the system if it
 *   is ever re-created, and deleted channels stay visible to the user in
 *   system settings until the app is reinstalled — so do it once,
 *   deliberately, not as a routine fix.
 */
public final class NotificationChannels {

    /** Streak nudges, daily challenge. */
    public static final String REMINDERS = "reminders";
    /** Test graded, weekly recap. */
    public static final String PROGRESS = "progress";
    /** League movement, duels. */
    public static final String SOCIAL = "social";
    /** Payment failed, subscription expired. Billing — must not be quiet. */
    public static final String ACCOUNT = "account";
    /**
     * Fallback for any message that arrives without an explicit
     * channel_id. Referenced by the manifest's
     * com.google.firebase.messaging.default_notification_channel_id.
     *
     * This exists rather than pointing the FCM default at "reminders":
     * until the server sets channel_id on every send, an un-tagged
     * payment failure would otherwise be filed under Reminders, and a
     * user who muted streak nudges would have muted billing too.
     */
    public static final String GENERAL = "general";

    private NotificationChannels() {}

    public static void createAll(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null) return;

        // HIGH: heads-up + sound. A failed payment or an expired
        // subscription costs the user access to what they paid for, and
        // there is a deadline attached (card retry, grace period). It is
        // the one category where missing the notification has a
        // real-world cost, so it is the one category that interrupts.
        manager.createNotificationChannel(channel(
                context, ACCOUNT,
                R.string.notification_channel_account_name,
                R.string.notification_channel_account_description,
                NotificationManager.IMPORTANCE_HIGH));

        // DEFAULT: sound, no heads-up interruption. Time-sensitive
        // enough to be noticed the same day (a streak expires at
        // midnight) but not worth taking over the screen.
        manager.createNotificationChannel(channel(
                context, REMINDERS,
                R.string.notification_channel_reminders_name,
                R.string.notification_channel_reminders_description,
                NotificationManager.IMPORTANCE_DEFAULT));

        // DEFAULT, not LOW, deliberately. "Test graded" is the reply to
        // something the student actively did and is waiting on; LOW
        // makes it silent AND keeps it out of the status-bar peek, which
        // reads as the result never arriving. The weekly recap is the
        // quieter half of this channel and is the reason a user might
        // want it turned down — which they can now do per-channel,
        // without touching anything else. That choice belongs to them,
        // and shipping LOW would pre-empt it in the wrong direction.
        manager.createNotificationChannel(channel(
                context, PROGRESS,
                R.string.notification_channel_progress_name,
                R.string.notification_channel_progress_description,
                NotificationManager.IMPORTANCE_DEFAULT));

        // DEFAULT: a duel invite is only useful while the opponent is
        // still waiting, so it needs to arrive audibly; it does not need
        // to interrupt.
        manager.createNotificationChannel(channel(
                context, SOCIAL,
                R.string.notification_channel_social_name,
                R.string.notification_channel_social_description,
                NotificationManager.IMPORTANCE_DEFAULT));

        manager.createNotificationChannel(channel(
                context, GENERAL,
                R.string.notification_channel_general_name,
                R.string.notification_channel_general_description,
                NotificationManager.IMPORTANCE_DEFAULT));
    }

    private static NotificationChannel channel(
            Context context, String id, int nameRes, int descriptionRes, int importance) {
        NotificationChannel c = new NotificationChannel(
                id, context.getString(nameRes), importance);
        c.setDescription(context.getString(descriptionRes));
        c.setShowBadge(true);
        return c;
    }
}
