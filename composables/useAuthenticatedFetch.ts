export const useAuthenticatedFetch = (url: string) => {
    const headers = useRequestHeaders(['cookie'])
    return useFetch(url, { headers })
  }
  