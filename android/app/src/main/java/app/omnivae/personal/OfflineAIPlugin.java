package app.omnivae.personal;

import android.app.Activity;
import android.content.Intent;
import android.database.Cursor;
import android.provider.OpenableColumns;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.*;
import com.getcapacitor.annotation.*;
import com.google.ai.edge.litertlm.*;
import java.io.*;
import java.nio.file.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;

/** Only public model weights are shared. Each request owns a fresh, non-persistent conversation. */
@CapacitorPlugin(name="OfflineAI")
public class OfflineAIPlugin extends Plugin {
    private final ExecutorService worker=Executors.newSingleThreadExecutor();
    private final AtomicBoolean busy=new AtomicBoolean(false);
    private volatile Conversation active;
    private volatile boolean cancelled;
    private volatile String requestId;
    private File model(){return new File(getContext().getFilesDir(),getContext().getSharedPreferences("offline-model",0).getString("file","offline-model.litertlm"));}
    @PluginMethod public void status(PluginCall call){JSObject r=new JSObject();r.put("available",model().isFile());r.put("bytes",model().length());r.put("name",getContext().getSharedPreferences("offline-model",0).getString("name","No model imported"));r.put("busy",busy.get());call.resolve(r);}
    @PluginMethod public void importModel(PluginCall call){
        if(!busy.compareAndSet(false,true)){call.reject("Offline engine is busy.");return;}
        Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT).setType("*/*").addCategory(Intent.CATEGORY_OPENABLE);
        try{startActivityForResult(call,intent,"modelPicked");}catch(Exception e){busy.set(false);call.reject("Could not open model picker.");}
    }
    @ActivityCallback private void modelPicked(PluginCall call,ActivityResult result){
        if(call==null){busy.set(false);return;}
        if(result.getResultCode()!=Activity.RESULT_OK||result.getData()==null||result.getData().getData()==null){busy.set(false);call.reject("Model import cancelled.");return;}
        android.net.Uri uri=result.getData().getData();
        worker.execute(()->{
            File temporary=new File(getContext().getFilesDir(),"offline-model.import");
            try{
                String name="";try(Cursor c=getContext().getContentResolver().query(uri,new String[]{OpenableColumns.DISPLAY_NAME},null,null,null)){if(c!=null&&c.moveToFirst())name=c.getString(0);}
                if(name==null||!(name.endsWith(".litertlm")||name.endsWith(".gguf")))throw new IOException();
                long total=0;try(InputStream in=getContext().getContentResolver().openInputStream(uri);OutputStream out=new FileOutputStream(temporary)){
                    if(in==null)throw new IOException();byte[] buffer=new byte[1024*1024];int n;
                    while((n=in.read(buffer))!=-1){total+=n;if(total>2_000_000_000L)throw new IOException();out.write(buffer,0,n);}
                }
                if(total<1_000_000)throw new IOException();
                boolean gguf=name.endsWith(".gguf");
                if(gguf){GgufEngine.validate(temporary.getAbsolutePath());}else try(Engine check=new Engine(new EngineConfig(temporary.getAbsolutePath(),new Backend.CPU(4,null),null,null,4096,null,getContext().getCacheDir().getAbsolutePath()))){check.initialize();}
                File target=new File(getContext().getFilesDir(),gguf?"offline-model.gguf":"offline-model.litertlm"),previous=model();
                Files.move(temporary.toPath(),target.toPath(),StandardCopyOption.REPLACE_EXISTING,StandardCopyOption.ATOMIC_MOVE);
                getContext().getSharedPreferences("offline-model",0).edit().putString("name",name).putString("file",target.getName()).commit();
                if(!previous.equals(target))previous.delete();
                JSObject r=new JSObject();r.put("name",name);r.put("bytes",total);r.put("available",true);call.resolve(r);
            }catch(Exception|OutOfMemoryError e){temporary.delete();call.reject("Import failed. Select a compatible .gguf or .litertlm model under 2 GB and check free space. Previous model retained.");}
            finally{busy.set(false);}
        });
    }
    @PluginMethod public void generate(PluginCall call){
        String prompt=call.getString("prompt"),id=call.getString("requestId");
        if(prompt==null||prompt.length()>16000||id==null){call.reject("Shorten the conversation or planning range for the offline model.");return;}
        if(!model().isFile()){call.reject("Import a .gguf or .litertlm model first.");return;}
        if(!busy.compareAndSet(false,true)){call.reject("Offline engine is still busy. Wait for it to stop.");return;}
        cancelled=false;requestId=id;GgufEngine.reset();
        worker.execute(()->{
            long started=System.currentTimeMillis();
            try{
            if(model().getName().endsWith(".gguf")){String output=new String(GgufEngine.generate(model().getAbsolutePath(),prompt.getBytes(java.nio.charset.StandardCharsets.UTF_8)),java.nio.charset.StandardCharsets.UTF_8);if(cancelled)throw new InterruptedException();JSObject r=new JSObject();r.put("text",output);r.put("elapsedMs",System.currentTimeMillis()-started);call.resolve(r);return;}
            try(Engine engine=new Engine(new EngineConfig(model().getAbsolutePath(),new Backend.CPU(4,null),null,null,4096,null,getContext().getCacheDir().getAbsolutePath()))){
                engine.initialize();if(cancelled)throw new InterruptedException();
                try(Conversation conversation=engine.createConversation(new ConversationConfig())){
                    active=conversation;if(cancelled)throw new InterruptedException();
                    String output=conversation.sendMessage(prompt).toString();
                    if(cancelled)throw new InterruptedException();
                    if(output.length()>500000)throw new IOException();
                    JSObject r=new JSObject();r.put("text",output);r.put("elapsedMs",System.currentTimeMillis()-started);call.resolve(r);
                }finally{active=null;}
            }}catch(Exception|OutOfMemoryError e){call.reject(cancelled?"Request cancelled.":"Offline model failed to load or generate. Check model compatibility, close other apps, or shorten the request.");}
            finally{requestId=null;busy.set(false);}
        });
    }
    @PluginMethod public void cancel(PluginCall call){if(call.getString("requestId","").equals(requestId))stop();call.resolve();}
    private void stop(){cancelled=true;GgufEngine.cancel();Conversation c=active;if(c!=null)try{c.cancelProcess();}catch(Exception ignored){}}
    @Override protected void handleOnStop(){stop();}
    @Override protected void handleOnDestroy(){stop();worker.shutdown();}
}
