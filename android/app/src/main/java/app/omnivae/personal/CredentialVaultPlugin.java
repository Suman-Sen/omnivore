package app.omnivae.personal;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

@CapacitorPlugin(name="CredentialVault")
public class CredentialVaultPlugin extends Plugin {
    private static final String ALIAS="omnivae.credentials.v1";
    private SharedPreferences store(){return getContext().getSharedPreferences("omnivae_credentials",Context.MODE_PRIVATE);}
    private String reference(PluginCall call) throws Exception {
        String ref=call.getString("reference");
        if(ref==null||!ref.matches("[a-fA-F0-9-]{36}:(openai|gemini)"))throw new Exception("Invalid reference");
        return ref;
    }
    private SecretKey key() throws Exception {
        KeyStore ks=KeyStore.getInstance("AndroidKeyStore");ks.load(null);
        if(!ks.containsAlias(ALIAS)){
            KeyGenerator generator=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");
            generator.init(new KeyGenParameterSpec.Builder(ALIAS,KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).setKeySize(256).build());
            generator.generateKey();
        }
        return (SecretKey)ks.getKey(ALIAS,null);
    }
    @PluginMethod public synchronized void put(PluginCall call){
        try{
            String ref=reference(call),value=call.getString("value");
            if(value==null||value.length()>16000)throw new Exception("Invalid payload");
            Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.ENCRYPT_MODE,key());cipher.updateAAD(ref.getBytes(StandardCharsets.UTF_8));
            String packed=Base64.encodeToString(cipher.getIV(),Base64.NO_WRAP)+":"+Base64.encodeToString(cipher.doFinal(value.getBytes(StandardCharsets.UTF_8)),Base64.NO_WRAP);
            if(!store().edit().putString(ref,packed).commit())throw new Exception("Write failed");call.resolve();
        }catch(Exception ignored){call.reject("Credential could not be saved.");}
    }
    @PluginMethod public synchronized void get(PluginCall call){
        try{
            String ref=reference(call),packed=store().getString(ref,null);JSObject result=new JSObject();
            if(packed!=null){String[] parts=packed.split(":",2);Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.DECRYPT_MODE,key(),new GCMParameterSpec(128,Base64.decode(parts[0],Base64.NO_WRAP)));cipher.updateAAD(ref.getBytes(StandardCharsets.UTF_8));result.put("value",new String(cipher.doFinal(Base64.decode(parts[1],Base64.NO_WRAP)),StandardCharsets.UTF_8));}
            call.resolve(result);
        }catch(Exception ignored){call.reject("Credential could not be opened. Re-enter it in settings.");}
    }
    @PluginMethod public synchronized void remove(PluginCall call){
        try{if(!store().edit().remove(reference(call)).commit())throw new Exception("Write failed");call.resolve();}
        catch(Exception ignored){call.reject("Credential could not be removed.");}
    }
}
