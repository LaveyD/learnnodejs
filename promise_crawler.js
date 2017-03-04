/**
 * Created by duanla on 3/1/2017.
 */
'use strict'

var http = require('http')
var Promise = require('bluebird')
var cheerio = require('cheerio')

var baseUrl = 'http://www.imooc.com/course/list'
var baseDomain = 'http://www.imooc.com'

var page_count = 1

function getPage(url) {
    return new Promise((resolve, reject) => {
        console.log('Now crawling ' + url)

        http.get(url, res => {
            var html = ''

            res.on('data', (data) => {
                html += data
            })

            res.on('end', () => {
                console.log("done")
                resolve(html)
            })
        }).on('error', (e) => {
            reject(e)
            console.log('Some error happens...')
        })
    })
}

function crawl_page(pageUrl) {
    getPage(pageUrl).then(pageHtml => {
        return new Promise((resolve, reject) => {
            try {
                var $ = cheerio.load(pageHtml)
                //courses in current page
                var courses = $('.index-card-container.course-card-container.container')
                courses.each((index) => {
                    console.log("page: " + page_count + ", course index: " + index)
                    console.log("Category    : " + $(this).find('.course-card-top.cart-color span').text())
                    console.log("Course Name : " + $(this).find('h3').text().replace(/\s*\r\n\s*/g, ''))
                    console.log("Course desc : " + $(this).find('p').text().replace(/\s*\r\n\s*/g, ''))
                    console.log("Level/Num   : " + $(this).find('.course-card-info').text().replace(/\s*\r\n\s*/g, ''))

                    if($(this).children() && $(this).children()[0].attribs){
                        var courseUrl = $(this).children()[0].attribs['href']
                        console.log("Course Url  : " + baseDomain + courseUrl + '\n')
                    }
                })
                resolve(pageHtml)
            } catch (e) {
                reject(e)
            }
        })
    }).then(pageHtml => {
        try {
            var $ = cheerio.load(pageHtml)
            //find next page url
            var pageUrlList = $('.page').children()
            var nextPageIndex = pageUrlList.length > 2 ? pageUrlList.length - 2 : 0
            var nextPageSuffix = pageUrlList[nextPageIndex].attribs['href']

            if (nextPageSuffix) {
                var nextPageUrl = baseDomain + nextPageSuffix
                console.log('Next page url is : ' + nextPageUrl)
                page_count ++
                crawl_page(nextPageUrl)
            } else {
                console.log('Crawler ends for all courses have been got')
            }

        } catch (e) {
            console.log("Some error happens: " + e)
        }
    })
}

crawl_page(baseUrl)

