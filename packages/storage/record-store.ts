import type {EncryptedValue} from '../domain/local-profile.ts';
export interface StoredRecord {
  id:string;profileId:string;kind:string;revision:number;value:EncryptedValue;
}
export interface RecordMutation {record:StoredRecord;expectedRevision:number;}
export interface RecordStore {
  listRecords(profileId:string):Promise<StoredRecord[]>;
  commitRecords(profileId:string,mutations:RecordMutation[],expected?:{id:string;revision:number}[]):Promise<void>;
}
