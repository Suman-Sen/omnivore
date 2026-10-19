import type {PluginListenerHandle} from '@capacitor/core';
import {Capacitor,registerPlugin} from '@capacitor/core';
import type {OfflineTransport} from '../ai/offline-provider';
export interface ModelStatus {available:boolean;name:string;bytes:number;busy?:boolean;}
export interface OfflineNative extends OfflineTransport {status():Promise<ModelStatus>;importModel():Promise<ModelStatus>;}
export const offlineNative=registerPlugin<OfflineNative>('OfflineAI');
export const hasNativeAI=()=>Capacitor.getPlatform()==='android';
export interface VoiceStatus {recognition:boolean;synthesis:boolean;}
export const offlineVoice=registerPlugin<{addListener(event:'voiceState',listener:(state:{speaking:boolean})=>void):Promise<PluginListenerHandle>;status():Promise<VoiceStatus>;listen():Promise<{text:string}>;speak(input:{text:string}):Promise<void>;stop():Promise<void>}>('OfflineVoice');
