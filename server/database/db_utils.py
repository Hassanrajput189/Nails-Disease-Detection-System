from pymongo import MongoClient
from fastapi import HTTPException
from pymongo.synchronous.database import Database
from pymongo.synchronous.collection import Collection

def connect_db(con_str:str,db_name:str) -> Database:
        try:
            client = MongoClient(con_str)
            db = client[db_name]        
            print("database created successfully")            
            return db        
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
        
        
def create_collection(db:Database,collection_name:str) -> Collection:
    collection = db[collection_name]
    print(f"{collection_name} collection created successfully")    
    return collection



    
    

    




