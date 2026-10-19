#include <jni.h>
#include "llama.h"
#include <atomic>
#include <memory>
#include <stdexcept>
#include <string>
#include <vector>
#include <mutex>

static std::atomic<bool> cancelled{false};
static std::once_flag initialized;
static bool abort_generation(void *) { return cancelled.load(); }
static void init(){std::call_once(initialized,[]{llama_log_set([](ggml_log_level,const char*,void*){},nullptr);llama_backend_init();});}
static void failure(JNIEnv *env){env->ThrowNew(env->FindClass("java/lang/IllegalStateException"),"Local GGUF inference failed. Check the model or shorten the request.");}
struct ModelDeleter {void operator()(llama_model *p)const{if(p)llama_model_free(p);}};
struct ContextDeleter {void operator()(llama_context *p)const{if(p)llama_free(p);}};
struct SamplerDeleter {void operator()(llama_sampler *p)const{if(p)llama_sampler_free(p);}};
static std::unique_ptr<llama_model,ModelDeleter> load(JNIEnv *env,jstring path){
 init();const char *raw=env->GetStringUTFChars(path,nullptr);std::string name(raw);env->ReleaseStringUTFChars(path,raw);
 auto params=llama_model_default_params();params.n_gpu_layers=0;
 auto model=std::unique_ptr<llama_model,ModelDeleter>(llama_model_load_from_file(name.c_str(),params));if(!model)throw std::runtime_error("model");return model;
}
extern "C" JNIEXPORT void JNICALL Java_app_omnivae_personal_GgufEngine_validate(JNIEnv *env,jclass,jstring path){try{auto model=load(env,path);}catch(...){failure(env);}}
extern "C" JNIEXPORT void JNICALL Java_app_omnivae_personal_GgufEngine_cancel(JNIEnv *,jclass){cancelled=true;}
extern "C" JNIEXPORT void JNICALL Java_app_omnivae_personal_GgufEngine_reset(JNIEnv *,jclass){cancelled=false;}
extern "C" JNIEXPORT jbyteArray JNICALL Java_app_omnivae_personal_GgufEngine_generate(JNIEnv *env,jclass,jstring path,jbyteArray input){
 try{
  auto model=load(env,path);if(cancelled)throw std::runtime_error("cancel");
  auto config=llama_context_default_params();config.n_ctx=4096;config.n_batch=512;config.n_threads=4;config.n_threads_batch=4;config.abort_callback=abort_generation;config.abort_callback_data=nullptr;
  auto ctx=std::unique_ptr<llama_context,ContextDeleter>(llama_init_from_model(model.get(),config));if(!ctx)throw std::runtime_error("context");
  std::string prompt(env->GetArrayLength(input),'\0');env->GetByteArrayRegion(input,0,prompt.size(),reinterpret_cast<jbyte*>(prompt.data()));
  const llama_chat_message message={"user",prompt.c_str()};const char *tmpl=llama_model_chat_template(model.get(),nullptr);
  int length=llama_chat_apply_template(tmpl,&message,1,true,nullptr,0);if(length<=0||length>100000)throw std::runtime_error("template");
  std::vector<char> formatted(length+1);llama_chat_apply_template(tmpl,&message,1,true,formatted.data(),formatted.size());
  auto vocab=llama_model_get_vocab(model.get());int count=-llama_tokenize(vocab,formatted.data(),length,nullptr,0,true,true);if(count<=0||count>3000)throw std::runtime_error("context budget");
  std::vector<llama_token> tokens(count);if(llama_tokenize(vocab,formatted.data(),length,tokens.data(),tokens.size(),true,true)<0)throw std::runtime_error("tokenize");
  for(int pos=0;pos<count;pos+=512){if(cancelled)throw std::runtime_error("cancel");auto batch=llama_batch_get_one(tokens.data()+pos,std::min(512,count-pos));if(llama_decode(ctx.get(),batch)!=0)throw std::runtime_error("decode");}
  auto sampler=std::unique_ptr<llama_sampler,SamplerDeleter>(llama_sampler_chain_init(llama_sampler_chain_default_params()));
  const char *grammar=R"GRAMMAR(root ::= object
value ::= object | array | string | number | "true" ws | "false" ws | "null" ws
object ::= "{" ws (string ":" ws value ("," ws string ":" ws value)*)? "}" ws
array ::= "[" ws (value ("," ws value)*)? "]" ws
string ::= "\"" ([^"\\\x00-\x1F] | "\\" (["\\/bfnrt] | "u" [0-9a-fA-F] [0-9a-fA-F] [0-9a-fA-F] [0-9a-fA-F]))* "\"" ws
number ::= "-"? ("0" | [1-9] [0-9]*) ("." [0-9]+)? ([eE] [+-]? [0-9]+)? ws
ws ::= [ \t\n\r]*
)GRAMMAR";
  auto constrained=llama_sampler_init_grammar(vocab,grammar,"root");if(!constrained)throw std::runtime_error("grammar");llama_sampler_chain_add(sampler.get(),constrained);llama_sampler_chain_add(sampler.get(),llama_sampler_init_greedy());
  std::string output;bool complete=false;
  for(int i=0;i<1536&&count+i<4095;i++){
   if(cancelled)throw std::runtime_error("cancel");auto token=llama_sampler_sample(sampler.get(),ctx.get(),-1);if(llama_vocab_is_eog(vocab,token)){complete=true;break;}
   char piece[256];int n=llama_token_to_piece(vocab,token,piece,sizeof(piece),0,true);if(n<0){std::vector<char> longPiece(-n);n=llama_token_to_piece(vocab,token,longPiece.data(),longPiece.size(),0,true);if(n<0)throw std::runtime_error("piece");output.append(longPiece.data(),n);}else output.append(piece,n);
   if(output.size()>500000)throw std::runtime_error("output budget");auto batch=llama_batch_get_one(&token,1);if(llama_decode(ctx.get(),batch)!=0)throw std::runtime_error("decode");
  }
  if(cancelled||!complete)throw std::runtime_error("incomplete");jbyteArray result=env->NewByteArray(output.size());env->SetByteArrayRegion(result,0,output.size(),reinterpret_cast<const jbyte*>(output.data()));return result;
 }catch(...){failure(env);return nullptr;}
}
