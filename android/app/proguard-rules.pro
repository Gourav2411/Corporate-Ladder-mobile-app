# =====================================================================
# Corporate Ladder Simulator — ProGuard / R8 release rules
# =====================================================================
# minifyEnabled is ON for release. These rules keep classes that are
# accessed reflectively (WebView JS bridges, Capacitor plugins, Firebase
# data classes, GSON-style models) so the app doesn't crash post-shrink.
# =====================================================================

# ---- WebView JS interface ----
# Capacitor exposes Capacitor.PluginMethod via WebView; keep all JS-callable methods.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# ---- Capacitor core + plugins ----
-keep class com.getcapacitor.** { *; }
-keep class com.capacitorjs.** { *; }
-keep class io.capawesome.capacitorjs.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keepclassmembers class * {
    @com.getcapacitor.PluginMethod <methods>;
}
-keepclasseswithmembers class * {
    @com.getcapacitor.annotation.PluginMethod <methods>;
}

# ---- Our own Capacitor plugin (Instagram Story share) ----
-keep class app.corporateladder.game.** { *; }

# ---- Firebase ----
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**

# ---- Keep enclosing methods + signatures (reflection) ----
-keepattributes Signature, InnerClasses, EnclosingMethod, *Annotation*

# ---- Source line numbers for crash reports (keep but rename source file) ----
-keepattributes SourceFile, LineNumberTable
-renamesourcefileattribute SourceFile

# ---- Strip Android Log calls in release for binary slimming + privacy ----
-assumenosideeffects class android.util.Log {
    public static int v(...);
    public static int d(...);
    public static int i(...);
}

# ---- Kotlin stdlib (transitive) ----
-dontwarn kotlin.**
-dontwarn org.jetbrains.annotations.**

# ---- Capacitor Firebase Auth plugin pulls in optional Facebook + Apple + Microsoft + Yahoo + Twitter handlers
#      that reference SDKs we don't ship. R8 must not fail on those. ----
-dontwarn com.facebook.**
-dontwarn com.facebook.login.**
-dontwarn com.facebook.login.widget.**
-dontwarn io.capawesome.capacitorjs.plugins.firebase.authentication.handlers.**

# ---- play-services-base (used transitively by firebase-auth) optional gRPC bits ----
-dontwarn com.google.android.gms.common.**
