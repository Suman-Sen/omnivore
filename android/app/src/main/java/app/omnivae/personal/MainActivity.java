package app.omnivae.personal;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
public class MainActivity extends BridgeActivity {
    @Override public void onCreate(Bundle savedInstanceState){registerPlugin(CredentialVaultPlugin.class);registerPlugin(OfflineAIPlugin.class);registerPlugin(OfflineVoicePlugin.class);super.onCreate(savedInstanceState);}
}
