export async function fetchGetJSON(url) {
  try {
    const response = await fetch(url);
    const responseJson = await response.json(); // parses JSON response into native JavaScript objects
    if (!response.ok) {
      throw new Error(responseJson.error);
    }
    return responseJson;
  } catch (err) {
    throw new Error(err.message);
  }
}

export async function fetchDeleteJSON(url, headers) {
  try {
    const response = await fetch(url, {
      method: "DELETE",
      ...(headers && { headers }),
    });
    const responseJson = await response.json(); // parses JSON response into native JavaScript objects
    if (!response.ok) {
      throw new Error(responseJson.error);
    }
    return responseJson;
  } catch (err) {
    throw new Error(err.message);
  }
}

export async function fetchPostJSON(url, data, headers) {
  try {
    // Default options are marked with *
    const response = await fetch(url, {
      method: "POST", // *GET, POST, PUT, DELETE, etc.
      mode: "cors", // no-cors, *cors, same-origin
      cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
      credentials: "same-origin", // include, *same-origin, omit
      headers: {
        "Content-Type": "application/json",
        ...headers,
        // 'Content-Type': 'application/x-www-form-urlencoded',
      },
      redirect: "follow", // manual, *follow, error
      referrerPolicy: "no-referrer", // no-referrer, *client
      body: JSON.stringify(data || {}), // body data type must match "Content-Type" header
    });
    const responseJson = await response.json(); // parses JSON response into native JavaScript objects
    if (!response.ok) {
      throw new Error(responseJson.error);
    }
    return responseJson;
  } catch (err) {
    throw new Error(err.message);
  }
}
