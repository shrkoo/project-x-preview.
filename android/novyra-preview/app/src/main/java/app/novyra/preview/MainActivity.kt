package app.novyra.preview

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.provider.Telephony
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import org.json.JSONArray
import org.json.JSONObject

class MainActivity : Activity() {
    private lateinit var webView: WebView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        webView = WebView(this)
        webView.setBackgroundColor(Color.WHITE)
        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.settings.allowFileAccess = false
        webView.settings.allowContentAccess = false
        webView.settings.mixedContentMode = android.webkit.WebSettings.MIXED_CONTENT_NEVER_ALLOW
        webView.webChromeClient = WebChromeClient()
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val uri = request.url
                if (uri.host == PREVIEW_HOST && uri.scheme == "https") return false
                startActivity(Intent(Intent.ACTION_VIEW, uri))
                return true
            }
        }
        webView.addJavascriptInterface(BankSmsBridge(this), "NovyraAndroid")
        setContentView(webView)
        activeWebView = webView
        webView.loadUrl(PREVIEW_URL)
    }

    fun requestSmsPermissions() {
        runOnUiThread {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val missing = SMS_PERMISSIONS.filter { checkSelfPermission(it) != PackageManager.PERMISSION_GRANTED }
                if (missing.isEmpty()) dispatchPermissionChanged(true)
                else requestPermissions(missing.toTypedArray(), SMS_PERMISSION_REQUEST)
            }
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == SMS_PERMISSION_REQUEST) {
            val granted = hasSmsReadPermission()
            dispatchPermissionChanged(granted)
            Toast.makeText(this, if (granted) "دسترسی پیامک فعال شد." else "برای خواندن پیامک بانکی باید اجازه پیامک را فعال کنید.", Toast.LENGTH_LONG).show()
        }
    }

    fun hasSmsReadPermission(): Boolean =
        Build.VERSION.SDK_INT < Build.VERSION_CODES.M ||
            checkSelfPermission(Manifest.permission.READ_SMS) == PackageManager.PERMISSION_GRANTED

    private fun dispatchPermissionChanged(granted: Boolean) {
        val js = "window.dispatchEvent(new CustomEvent('novyra-sms-permission-changed',{detail:{granted:" + granted + "}}));"
        webView.post { webView.evaluateJavascript(js, null) }
    }

    override fun onBackPressed() {
        if (::webView.isInitialized && webView.canGoBack()) webView.goBack() else super.onBackPressed()
    }

    override fun onDestroy() {
        if (activeWebView === webView) activeWebView = null
        webView.destroy()
        super.onDestroy()
    }

    companion object {
        const val PREVIEW_HOST = "feature-homa-auth-part1.novyra.pages.dev"
        const val PREVIEW_URL = "https://feature-homa-auth-part1.novyra.pages.dev/"
        const val SMS_PERMISSION_REQUEST = 4021
        val SMS_PERMISSIONS = arrayOf(Manifest.permission.READ_SMS, Manifest.permission.RECEIVE_SMS)
        @Volatile var activeWebView: WebView? = null

        fun dispatchBankSms(sender: String?, body: String?, receivedAt: Long) {
            val text = body ?: return
            if (!BankSmsFilter.isBankMessage(sender.orEmpty(), text)) return
            val payload = JSONObject()
                .put("id", "sms-" + receivedAt + "-" + (sender ?: "bank").hashCode())
                .put("address", sender ?: "")
                .put("body", text)
                .put("date", receivedAt)
                .toString()
            val js = "window.dispatchEvent(new CustomEvent('novyra-bank-sms',{detail:JSON.parse(" + JSONObject.quote(payload) + ")}));"
            activeWebView?.post { activeWebView?.evaluateJavascript(js, null) }
        }
    }
}

class BankSmsBridge(private val activity: MainActivity) {
    @JavascriptInterface
    fun isSmsPermissionGranted(): Boolean = activity.hasSmsReadPermission()

    @JavascriptInterface
    fun requestSmsPermission() = activity.requestSmsPermissions()

    @JavascriptInterface
    fun readBankSms(): String {
        if (!activity.hasSmsReadPermission()) return "[]"
        val output = JSONArray()
        val cutoff = System.currentTimeMillis() - 90L * 24L * 60L * 60L * 1000L
        val projection = arrayOf(Telephony.Sms._ID, Telephony.Sms.ADDRESS, Telephony.Sms.BODY, Telephony.Sms.DATE)
        val cursor = activity.contentResolver.query(
            Telephony.Sms.Inbox.CONTENT_URI,
            projection,
            Telephony.Sms.DATE + " >= ?",
            arrayOf(cutoff.toString()),
            Telephony.Sms.DATE + " DESC"
        )
        cursor?.use {
            val idIndex = it.getColumnIndexOrThrow(Telephony.Sms._ID)
            val addressIndex = it.getColumnIndexOrThrow(Telephony.Sms.ADDRESS)
            val bodyIndex = it.getColumnIndexOrThrow(Telephony.Sms.BODY)
            val dateIndex = it.getColumnIndexOrThrow(Telephony.Sms.DATE)
            var count = 0
            while (it.moveToNext() && count < 300) {
                val address = it.getString(addressIndex).orEmpty()
                val body = it.getString(bodyIndex).orEmpty()
                if (!BankSmsFilter.isBankMessage(address, body)) continue
                output.put(JSONObject().put("id", it.getString(idIndex)).put("address", address).put("body", body).put("date", it.getLong(dateIndex)))
                count++
            }
        }
        return output.toString()
    }
}

object BankSmsFilter {
    private val transactionTerms = Regex("(واریز|برداشت|خرید|پرداخت|انتقال|مانده|موجودی|تراکنش|deposit|withdraw|purchase|payment|balance|transaction)", RegexOption.IGNORE_CASE)
    private val sensitiveCodeTerms = Regex("(رمز پویا|رمز یکبار|کد تایید|کد تأیید|رمز ورود|otp|one.time.password|verification code)", RegexOption.IGNORE_CASE)

    fun isBankMessage(sender: String, body: String): Boolean {
        if (body.isBlank() || sensitiveCodeTerms.containsMatchIn(body)) return false
        return transactionTerms.containsMatchIn(body) || sender.contains("BANK", ignoreCase = true)
    }
}

class BankSmsReceiver : android.content.BroadcastReceiver() {
    override fun onReceive(context: android.content.Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return
        val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent) ?: return
        messages.forEach { message ->
            MainActivity.dispatchBankSms(message.originatingAddress, message.messageBody, message.timestampMillis)
        }
    }
}
