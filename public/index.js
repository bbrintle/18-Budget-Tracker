let transactions = [];
let myChart;

//Connect to MongoDB Atlas and retrieve data
fetch("/api/transaction")
  .then(response => {
    return response.json();
  })
  .then(data => {
    // save db data on global variable
    if(verifyIndexedDB()) {
      useIndexedDB("budget", "transactions", "get")
      .then(results => {
        //Save each transaction in IndexedDB to MongoDB.
        console.log(`Results found in IndexedDB: ${results}`);
        results.forEach(result => {
          console.log(`Found result: ${result.name}.`);
          sendToDatabase(result);
        });

        //Now clear IndexedDB.
        clearStore("budget", "transactions");

        //Save DB data on global variable.
        transactions = data;

        console.log(`Data retrieved from MongoDB at start: ${transactions}`);

        populateTotal();
        populateTable();
        populateChart();
      });
    }
  })
  .catch(error => {
    console.log("Database not connected. Using offline mode.");

  });

function populateTotal() {
  // reduce transaction amounts to a single total value
  let total = transactions.reduce((total, t) => {
    return total + parseInt(t.value);
  }, 0);

  let totalEl = document.querySelector("#total");
  totalEl.textContent = total;
}

function populateTable() {
  let tbody = document.querySelector("#tbody");
  tbody.innerHTML = "";

  transactions.forEach(transaction => {
    // create and populate a table row
    let tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${transaction.name}</td>
      <td>${transaction.value}</td>
    `;

    tbody.appendChild(tr);
  });
}

function populateChart() {
  // copy array and reverse it
  let reversed = transactions.slice().reverse();
  let sum = 0;

  // create date labels for chart
  let labels = reversed.map(t => {
    let date = new Date(t.date);
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
  });

  // create incremental values for chart
  let data = reversed.map(t => {
    sum += parseInt(t.value);
    return sum;
  });

  // remove old chart if it exists
  if (myChart) {
    myChart.destroy();
  }

  let ctx = document.getElementById("myChart").getContext("2d");

  myChart = new Chart(ctx, {
    type: 'line',
      data: {
        labels,
        datasets: [{
            label: "Total Over Time",
            fill: true,
            backgroundColor: "#6666ff",
            data
        }]
    }
  });
}

function sendTransaction(isAdding) {
  let nameEl = document.querySelector("#t-name");
  let amountEl = document.querySelector("#t-amount");
  let errorEl = document.querySelector(".form .error");

  // validate form
  if (nameEl.value === "" || amountEl.value === "") {
    errorEl.textContent = "Missing Information";
    return;
  }
  else {
    errorEl.textContent = "";
  }

  // create record
  let transaction = {
    name: nameEl.value,
    value: amountEl.value,
    date: new Date().toISOString()
  };

  // if subtracting funds, convert amount to negative number
  if (!isAdding) {
    transaction.value *= -1;
  }

  // add to beginning of current array of data
  transactions.unshift(transaction);

  // re-run logic to populate ui with new record
  populateChart();
  populateTable();
  populateTotal();
  
  // also send to server
  fetch("/api/transaction", {
    method: "POST",
    body: JSON.stringify(transaction),
    headers: {
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/json"
    }
  })
  .then(response => {    
    return response.json();
  })
  .then(data => {
    if (data.errors) {
      errorEl.textContent = "Missing Information";
    }
    else {
      //Clear the form, if this is happening after clicking a button.
      if(nameEl) {
        nameEl.value = "";
      }

      if(amountEl) {
        amountEl.value = "";
      }
    }
  })
  .catch(err => {
    //Send the data to indexedDB if there is no internet connection.
    useIndexedDB("budget", "transactions", "put", data);

    //Clear the form, if this is happening after clicking a button.
    if(nameEl) {
      nameEl.value = "";
    }

    if(amountEl) {
      amountEl.value = "";
    }
  });
}

document.querySelector("#add-btn").onclick = function() {
  sendTransaction(true);
};

document.querySelector("#sub-btn").onclick = function() {
  sendTransaction(false);
};

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
          resolve(all.result);
        };
      } else if (method === "delete") {
        store.delete(object._id);
      }
      tx.oncomplete = function() {
        db.close();
      };
    };
  });
}

function clearStore(databaseName, storeName) {
  const request = window.indexedDB.open(databaseName, 1);

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