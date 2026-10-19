package app.omnivae.personal;
final class GgufEngine {
 static {System.loadLibrary("omnivae_gguf");}
 static native void validate(String path);
 static native byte[] generate(String path,byte[] prompt);
 static native void cancel();
 static native void reset();
}
