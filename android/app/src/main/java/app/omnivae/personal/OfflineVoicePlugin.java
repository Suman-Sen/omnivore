package app.omnivae.personal;
import android.Manifest;
import android.content.Intent;
import android.os.*;
import android.speech.*;
import android.speech.tts.*;
import com.getcapacitor.*;
import com.getcapacitor.annotation.*;
import java.util.*;

@CapacitorPlugin(name="OfflineVoice",permissions={@Permission(alias="microphone",strings={Manifest.permission.RECORD_AUDIO})})
public class OfflineVoicePlugin extends Plugin {
 private TextToSpeech tts;private boolean ready;private SpeechRecognizer recognizer;private PluginCall listening;
 private final Handler main=new Handler(Looper.getMainLooper());
 private final Runnable timeout=()->finish(null,"Voice input timed out. Tap Talk to try again.");
 @Override public void load(){main.post(()->tts=new TextToSpeech(getContext(),status->{ready=status==TextToSpeech.SUCCESS;if(ready)tts.setOnUtteranceProgressListener(new UtteranceProgressListener(){public void onStart(String id){voiceState(true);}public void onDone(String id){voiceState(false);}public void onError(String id){voiceState(false);}public void onStop(String id,boolean interrupted){voiceState(false);}});}));}
 private void voiceState(boolean speaking){JSObject state=new JSObject();state.put("speaking",speaking);notifyListeners("voiceState",state);}
 private Voice localVoice(){if(!ready||tts==null||tts.getVoices()==null)return null;for(Voice v:tts.getVoices())if(!v.isNetworkConnectionRequired()&&v.getLocale().getLanguage().equals("en")&&(v.getFeatures()==null||!v.getFeatures().contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED)))return v;return null;}
 @PluginMethod public void status(PluginCall call){main.post(()->{JSObject r=new JSObject();r.put("recognition",Build.VERSION.SDK_INT>=31&&SpeechRecognizer.isOnDeviceRecognitionAvailable(getContext()));r.put("synthesis",localVoice()!=null);call.resolve(r);});}
 @PluginMethod public void listen(PluginCall call){if(getPermissionState("microphone")!=PermissionState.GRANTED){requestPermissionForAlias("microphone",call,"permissionResult");return;}start(call);}
 @PermissionCallback private void permissionResult(PluginCall call){if(getPermissionState("microphone")!=PermissionState.GRANTED){call.reject("Microphone permission denied. You can still type.");return;}start(call);}
 private void start(PluginCall call){main.post(()->{
  if(listening!=null){call.reject("Already listening.");return;}
  if(Build.VERSION.SDK_INT<31||!SpeechRecognizer.isOnDeviceRecognitionAvailable(getContext())){call.reject("Offline recognition is unavailable. Install an on-device English speech pack in Android settings; typing remains available.");return;}
  if(tts!=null)tts.stop();listening=call;
  try{
   recognizer=SpeechRecognizer.createOnDeviceSpeechRecognizer(getContext());
   recognizer.setRecognitionListener(new RecognitionListener(){
    public void onReadyForSpeech(Bundle b){} public void onBeginningOfSpeech(){} public void onRmsChanged(float n){} public void onBufferReceived(byte[] b){} public void onEndOfSpeech(){} public void onPartialResults(Bundle b){} public void onEvent(int n,Bundle b){}
    public void onError(int code){finish(null,"Offline speech could not transcribe (code "+code+"). Check the installed English speech pack or type instead.");}
    public void onResults(Bundle b){ArrayList<String> words=b.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);finish(words==null||words.isEmpty()?"":words.get(0),null);}
   });
   Intent intent=new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL,RecognizerIntent.LANGUAGE_MODEL_FREE_FORM).putExtra(RecognizerIntent.EXTRA_LANGUAGE,"en-IN").putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE,true).putExtra(RecognizerIntent.EXTRA_MAX_RESULTS,1);
   recognizer.startListening(intent);main.postDelayed(timeout,45000);
  }catch(Exception e){finish(null,"Offline microphone could not start. You can still type.");}
 });}
 private void finish(String text,String error){main.removeCallbacks(timeout);PluginCall call=listening;listening=null;if(recognizer!=null){recognizer.destroy();recognizer=null;}if(call!=null){if(error!=null)call.reject(error);else{JSObject r=new JSObject();r.put("text",text);call.resolve(r);}}}
 @PluginMethod public void speak(PluginCall call){main.post(()->{String text=call.getString("text","");Voice voice=localVoice();if(voice==null){call.reject("No downloaded offline English voice. Install one in Android text-to-speech settings.");return;}if(text.isEmpty()||text.length()>4000){call.reject("Reply is too long to read aloud.");return;}tts.setVoice(voice);if(tts.speak(text,TextToSpeech.QUEUE_FLUSH,null,"omnivae-reply")==TextToSpeech.ERROR)call.reject("Offline speech output failed.");else call.resolve();});}
 @PluginMethod public void stop(PluginCall call){main.post(()->{finish(null,"Voice input stopped.");if(tts!=null)tts.stop();voiceState(false);call.resolve();});}
 @Override protected void handleOnStop(){main.post(()->{finish(null,"Voice stopped when app left the foreground.");if(tts!=null)tts.stop();});}
 @Override protected void handleOnDestroy(){main.post(()->{finish(null,"Voice stopped.");if(tts!=null){tts.shutdown();tts=null;}ready=false;});}
}
