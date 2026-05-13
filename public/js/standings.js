async function loadTable(){

  const res =
  await fetch(
    "/api/standings/39"
  );

  const data =
  await res.json();

  document.getElementById(
    "table"
  ).innerHTML =
  JSON.stringify(data);

}

loadTable();
