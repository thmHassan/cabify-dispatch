import BaseService from "./BaseService";

const ApiService = {
  fetchData(param) {
    return new Promise((resolve, reject) => {
      BaseService(param)
        .then((response) => {
          resolve(response);
        })
        .catch((errors) => {
          reject(errors);
        });
    });
  },

  getDispatcherCards() {
    return new Promise((resolve, reject) => {
      BaseService({
        method: "GET",
        url: "/company/dispatcher-cards",
      })
        .then((response) => {
          resolve(response);
        })
        .catch((errors) => {
          reject(errors);
        });
    });
  },

  getDispatcherList({ page = 1, perPage, search } = {}) {
    return new Promise((resolve, reject) => {
      const params = { page, perPage };
      if (search) {
        params.search = search;
      }
      BaseService({
        method: "GET",
        url: "/company/list-dispatcher",
        params,
      })
        .then((response) => {
          resolve(response);
        })
        .catch((errors) => {
          reject(errors);
        });
    });
  },
};

export default ApiService;
