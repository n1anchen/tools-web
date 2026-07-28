import axios from "axios";
import { ElMessage } from "element-plus";

const baseApi = import.meta.env.VITE_APP_BASE_API || ''
const server = import.meta.env.VITE_SERVE || ''

//创建axios实例
const request = axios.create({
    baseURL: import.meta.env.VITE_IS_MOCK === 'true' ? baseApi : server + baseApi,
    timeout: 5000
});  

//请求拦截器
request.interceptors.request.use(config => {
    return config;
});
//响应拦截器
request.interceptors.response.use((response) => {
    if (response.data?.code === 401) {
        //登录过期
        try {
            localStorage.removeItem('TOKEN')
        } catch {
            // Ignore storage failures; the page reload still clears app state.
        }
        location.reload()
    }
    return response.data;
}, (error) => {
    if (axios.isCancel(error) || error.code === 'ERR_CANCELED') {
        return Promise.reject(error);
    }
    //处理网络错误
    let msg = '网络请求失败';
    const status = error.response?.status;
    switch (status) {
        case 401:
            //msg = "token过期";
            msg = "登录过期";
            break;
        case 403:
            msg = '无权访问';
            break;
        case 404:
            msg = "请求地址错误";
            break;
        case 500:
            msg = "服务器出现问题";
            break;
        default:
            msg = error.code === 'ECONNABORTED' ? '请求超时' : '网络连接失败';

    }
    ElMessage({
        type: 'error',
        message: msg
    })
    return Promise.reject(error);
});
export default request;
