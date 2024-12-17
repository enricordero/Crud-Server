"use strict";

$(document).ready(function () {
  const divIntestazione = $("#divIntestazione");
  const divFilters = $(".card").eq(0);
  const divCollections = $("#divCollections");
  const table = $("#mainTable");
  const divDettagli = $("#divDettagli");
  const btnAdd = $("#btnAdd").prop("disabled", true);
  let currentCollection = "";

  divFilters.hide();
  const lstHair = $("#lstHair").prop("selectedIndex", -1);

  getCollections();

  async function getCollections() {
    const data = await inviaRichiesta("GET", "/api/getCollections");
    if (data) {
      console.log(data);
      const label = divCollections.children("label");
      for (const collection of data) {
        const clonedLabel = label.clone().appendTo(divCollections);
        clonedLabel.children("span").text(collection.name);
        clonedLabel
          .children("input")
          .val(collection.name)
          .on("click", function () {
            currentCollection = this.value;
            btnAdd.prop("disabled", false);
            getDataCollection();
          });
      }
      label.remove();
    }
  }

  btnAdd.on("click", function () {
    divDettagli.empty();
    $("<textarea>")
      .appendTo(divDettagli)
      .prop("placeholder", '{"Name": "[the name of the new unicorn]"}');
    $("<button>")
      .addClass("btn btn-success btn-sm")
      .text("Insert")
      .appendTo(divDettagli)
      .on("click", async function () {
        let record = divDettagli.children("textarea").val();
        try {
          record = JSON.parse(record);
          const data = await inviaRichiesta(
            "POST",
            "/api/" + currentCollection,
            record
          );
          if (data) {
            console.log(data);
            alert("Record added correctly");
            getDataCollection();
          }
        } catch (err) {
          alert("Error: JSON not valid\n" + err);
          return;
        }
      });
  });
  $("#btnFind").on("click", function () {
    let hair = lstHair.val();
    let gender = "";
    if (divFilters.find("input:checkbox:checked").length == 1) {
      gender = divFilters.find("input:checkbox:checked").val();
    }
    let filters = {};
    if (hair) {
      filters["hair"] = hair.toLowerCase();
    }
    if (gender) {
      filters["gender"] = gender.toLowerCase();
    }
    getDataCollection(filters);
  });
  async function deleteRecord(_id) {
    if (confirm(`Vuoi veramente cancellare il record: ${_id}?`)) {
      const data = await inviaRichiesta(
        "DELETE",
        "/api/" + currentCollection + "/" + _id
      );
      if (data) {
        console.log(data);
        alert("Record rimosso correttamente");
        getDataCollection();
      }
    }
  }

  async function putRecord(_id) {
    divDettagli.empty();
    const textarea = $("<textarea>")
      .appendTo(divDettagli)
      .prop("placeholder", '{"$inc": {"vampires": 2}}');
    $("<button>")
      .addClass("btn btn-success btn-sm")
      .text("Update")
      .appendTo(divDettagli)
      .on("click", async function () {
        if (textarea.val()) {
          let json;
          try {
            json = JSON.parse(textarea.val());
          } catch (err) {
            alert("Error! Invalid JSON");
            return;
          }
          const data = await inviaRichiesta(
            "PUT",
            `/api/${currentCollection}/${_id}`,
            { action: json }
          );
          if (data?.modifiedCount == 1) {
            alert("Record updated successfully!");
            getDataCollection();
          } else {
            alert("Unable to update the record!");
          }
        }
      });
  }

  async function getDataCollection(filter = {}) {
    divDettagli.empty();
    const data = await inviaRichiesta(
      "GET",
      "/api/" + currentCollection,
      filter
    );
    if (data) {
      console.log(data);

      divIntestazione.find("strong").eq(0).text(currentCollection);
      divIntestazione.find("strong").eq(1).text(data.length);
      let tbody = table.children("tbody");
      tbody.empty();

      data.forEach((element) => {
        //Accedo alla secondo chiave di element
        let key = Object.keys(element)[1];
        let tr = $("<tr>").appendTo(tbody);
        $("<td>")
          .appendTo(tr)
          .text(element["_id"])
          .on("click", function () {
            getDetails($(this).text());
          });
        $("<td>")
          .appendTo(tr)
          .text(element[key])
          .on("click", function () {
            getDetails(element["_id"]);
          });

        let td = $("<td>").appendTo(tr);
        $("<div>")
          .appendTo(td)
          .on("click", () => {
            getDetails(element._id, "PATCH");
          });
        $("<div>")
          .appendTo(td)
          .on("click", () => {
            putRecord(element._id);
          });
        $("<div>")
          .appendTo(td)
          .on("click", () => {
            deleteRecord(element._id);
          });
      });
      if (currentCollection == "unicorns") {
        divFilters.show();
      } else {
        divFilters.hide();
        divFilters.find("input:checkbox").prop("checked", false);
        lstHair.prop("selectedIndex", -1);
      }
    }
  }
  $("#btnFind").on("click", function () {
    alert("ciao");
    let hair = lstHair.val();
    let gender = "";
    if (divFilters.find("input:checkbox:checked").length == 1) {
      gender = divFilters.find("input:checkbox:checked").val();
    }
    let filters = {};
    if (hair) {
      filters["hair"] = hair.toLowerCase();
    }
    if (gender) {
      filters["gender"] = gender.toLowerCase();
    }
    getDataCollection(filters);
  });
  async function getDetails(id, method = "GET") {
    console.log(id);
    let data = await inviaRichiesta(
      "GET",
      "/api/" + currentCollection + "/" + id
    );
    if (data) {
      console.log(data);
      divDettagli.empty();
      if (method == "GET") {
        for (let key in data) {
          $("<strong>").appendTo(divDettagli).text(key);
          $("<span>").appendTo(divDettagli).text(JSON.stringify(data[key]));
          $("<br>").appendTo(divDettagli);
        }
      } else {
        delete data._id;
        const textarea = $("<textarea>")
          .appendTo(divDettagli)
          .val(JSON.stringify(data, null, 2));
        textarea.css("height", `${textarea.get(0).scrollHeight}px`);
        $("<button>")
          .addClass("btn btn-success btn-sm")
          .text("Update")
          .appendTo(divDettagli)
          .on("click", async function () {
            if (textarea.val()) {
              let json;
              try {
                json = JSON.parse(textarea.val());
              } catch (err) {
                alert("Error! Invalid JSON");
                return;
              }
              if ("_id" in json) {
                delete json._id;
              }
              const data = await inviaRichiesta(
                "PATCH",
                `/api/${currentCollection}/${id}`,
                { action: json }
              );
              if (data?.modifiedCount == 1) {
                alert("Record updated successfully!");
                getDataCollection();
              } else {
                alert("Unable to update the record!");
              }
            }
          });
      }
    }
  }
});
