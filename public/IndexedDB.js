//Ensure that IndexedDB is possible in the browser.
function verifyIndexedDB() {
    if (!window.indexedDB) {
      console.log("Your browser doesn't support IndexedDB. There may be a problem saving/storing budget data.");
      alert("Your browser doesn't support IndexedDB. There may be a problem saving/storing budget data.");
      return false;
    } else {
      return true;
    }
  }
  
  //This function interacts with IndexedDB to perform CRUD operations. 'Object' will be ommitted when getting from the DB.
  //The fourth argument 'object' will contain the properties of a new transaction when "putting" into the DB
  //The fourth argument 'object' will contain an ID when deleting. 
  function useIndexedDB(databaseName, storeName, method, object) {
    return new Promise((resolve, reject) => {
      //Open IndexedDB using the DB name passed in.
      const request = window.indexedDB.open(databaseName, 1);
      let db, tx, store;
  
      request.onupgradeneeded = function(e) {
        const db = request.result;
        //Create the name of the transactions store.
        db.createObjectStore(storeName, { keyPath: "key", autoIncrement: true});
      };
  
      request.onerror = function(e) {
        //Log an error if needed.
        console.log("There was an error");
        alert("Something went wrong with IndexedDB.");
      };
  
      //If the request to open IndexedDB is successful:
      request.onsuccess = function(e) {
        //Identify the DB.
        db = request.result;
  
        //Create a transaction with the desired store.
        tx = db.transaction(storeName, "readwrite");
        store = tx.objectStore(storeName);
  
        db.onerror = function(e) {
          console.log("error");
          alert("Something went wrong trying to access the correct store.");
        };
        //If the method passed in is 'put', store the passed in object.
        if (method === "put") {
          store.put(object);
          console.log("Record inserted into IndexedDB");
        } else if (method === "get") {
          //If the method is 'get', grab all the items stored in indexedDB.
          const all = store.getAll();
          all.onsuccess = function() {
            //Resolve the promise.
            resolve(all.result);
          };
          //If the method is 'delete', delete the transaction with the ID passed iin.
        } else if (method === "delete") {
          store.delete(object._id);
        }
        tx.oncomplete = function() {
          //Close the DB once operation is finished.
          db.close();
        };
      };
    });
  }
  
  function clearStore(databaseName, storeName) {
    const request = window.indexedDB.open(databaseName, 1);
  
    //Request a delete on the object store once the database is open.
    request.onsuccess = function(event) {
      db = request.result;
  
      let deleteTransaction = db.transaction(storeName, "readwrite");
  
      deleteTransaction.onerror = function(event) {
        console.log("Something went wrong opening a delete transaction.");
      }
  
      let objectStore = deleteTransaction.objectStore(storeName);
  
      let objectStoreRequest = objectStore.clear();
  
      objectStoreRequest.onsuccess = function(event) {
        console.log("Delete Successful");
      }
    }
  }