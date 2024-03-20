const request = require("request-promise")
const cheerio = require("cheerio")
const ObjectsToCsv = require("objects-to-csv")

// For Handling Bad Network Connectivity
// yarn add requestretry
// const request = require('requestretry').defaults({ fullResponse: false, maxAttempts: ,retryDelay:  })

const url = "https://delhi.craigslist.org/search/sof#search=1~thumb~0~0"

async function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

async function scrapeCraigsList() {
  try {
    const htmlResult = await request.get(url)
    const $ = await cheerio.load(htmlResult)

    const listings = $(".cl-static-search-result")
      .map((index, element) => {
        const title = $(element).attr("title")
        const url = $(element).find("a").attr("href")
        const hood = $(element)
          .find("a > div.details > div.location")
          .text()
          .trim()
          .replace("(", "")
          .replace(")", "")

        return { title, url, hood }
      })
      .get()
    // when using .map() then we have to use .get(), (because by default it returns cheerio object)

    const listingsWithJobDescriptions = await scrapeJobDescriptions(listings)

    console.log(listingsWithJobDescriptions)

    await createCsvFile(listingsWithJobDescriptions)
  } catch (err) {
    console.error(err)
  }
}

async function scrapeJobDescriptions(listings) {
  for (var i = 0; i < listings.length; i++) {
    try {
      const htmlResult = await request.get(listings[i].url)
      const $ = await cheerio.load(htmlResult)

      const jobDescription = $("#postingbody").text()
      listings[i].jobDescription = jobDescription

      const compensation = $(
        "div.attrgroup > div.attr:nth-child(1) > span.valu"
      ).text()
      listings[i].compensation = compensation

      // limiting scraping request rate
      await sleep(1000)
    } catch (err) {
      console.error(err)
    }
  }
  return listings
}

async function createCsvFile(data) {
  let csv = new ObjectsToCsv(data)

  // Save to File
  await csv.toDisk("./test.csv")

  // // Return the CSV file as string
  // console.log(await csv.toString())
}

scrapeCraigsList()
