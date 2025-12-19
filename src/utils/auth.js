export const getDispatcherId = () => {
    try {
        const user = JSON.parse(localStorage.getItem("auth_user"));
        return user?.id ?? null;
    } catch (e) {
        return null;
    }
};
