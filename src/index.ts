//const axios = require('axios').default;
import axios from "axios"
import rateLimit, { RateLimitedAxiosInstance } from "axios-rate-limit"
import axiosDebugger from "axios-debug-log"
import path from "path"
const __dirname = path.resolve()
import dotenv from "dotenv"
dotenv.config({ path: `${__dirname}/../.env` })

const MB_API_VER = 6
const BASE_URL = `https://api.mindbodyonline.com/public/v${MB_API_VER}`
const MAX_SERVICE_REQ = 200 // in range 0 - 200
const API_TOKEN = process.env.API_TOKEN
const SITE_ID = process.env.SITE_ID

interface service {
    Count: number,
    Name: string,
    ExpirationUnit: string,
    ExpirationLength: number
}

function configureAxiosDebug() {
    // TODO debugging doesn't work
    axiosDebugger({
        request: function (debug, config) {
            debug('Request with ' + config.headers['content-type'])
        },
        response: function (debug, response) {
            debug(
                'Response with ' + response.headers['content-type'],
                'from ' + response.config.url
            )
        },
        error: function (debug, error) {
            // Read https://www.npmjs.com/package/axios#handling-errors for more info
            debug('Boom', error)
        }
    })
}

async function getUserToken(): Promise<string> {
    let token = ''
    try {
        const response = await axios.post(`/usertoken/issue`, { username: process.env.USER_NAME, password: process.env.USER_PASSWORD })
        token = response.data.AccessToken

    } catch (error) {
        console.log(error)

    }
    return token
}

async function getServices(limiter: RateLimitedAxiosInstance) {
    const requestSize = MAX_SERVICE_REQ
    let offset = 0
    let services: service[] = []
    let allServices = services
    let moreData = false
    do {
        try {
            const response = await limiter.get(`/sale/services?limit=${requestSize}&offset=${offset}`,)
            // console.log(prettyJSON.render(response.data.Services))
            services = response.data.Services
            allServices = allServices.concat(services)
            console.log(`Received ${services.length} items.`)
            if (services.length === requestSize) {
                moreData = true
                offset += requestSize
            } else {
                moreData = false
            }
        } catch (error) {
            console.log("Error: ", error)
            services = []
        }
    } while (moreData)
    return allServices
}

function processServices(services: service[]) {

    function updateServiceExpiration() {
        // FUUCK no API support for updating payment options...
    }

    services.forEach((service) => {
        if (service.Count > 1) {
            console.log(service.Name)
            updateServiceExpiration()
        }
    })
}

async function main() {
    axios.defaults.baseURL = BASE_URL;
    axios.defaults.headers["API-Key"] = API_TOKEN
    axios.defaults.headers.SiteId = SITE_ID
    axios.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded';
    axios.defaults.timeout = 2000

    const AUTH_TOKEN = await getUserToken()
    axios.defaults.headers.common['Authorization'] = AUTH_TOKEN;
    const limiter = rateLimit(axios.create(), { maxRPS: 10 })
    configureAxiosDebug()

    // console.log("AUTH_TOKEN", AUTH_TOKEN)

    const services = await getServices(limiter)
    //console.log(prettyJSON.render(services))

    processServices(services)

    console.log("Done.")
}

main()



