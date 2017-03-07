/**
 * Created by duanla on 3/1/2017.
 */
'use strict'

var http = require('http')
var Promise = require('bluebird')
var cheerio = require('cheerio')
var mongoose = require('mongoose')

var baseUrl = 'http://www.imooc.com/course/list'
var baseDomain = 'http://www.imooc.com'

var page_count = 1
var db = mongoose.createConnection('mongodb://localhost:27017/COURSES')
var Schema = mongoose.Schema

db.on('error', function (error) {
    console.log(error)
})

var courseSchema = new Schema({
    "course_id": {type: String},
    "course_category": {type: String},
    "course_name": {type: String},
    "course_desc": {type: String},
    "course_level": {type: String},
    "learned_num": {type: String},
    "course_url": {type: String}
}, {collection: "course_list"});

var mongooseModel = db.model('mongoose', courseSchema)

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
                    var courseItem = {
                        "course_id": (page_count + "-" + index),
                        "course_category": $(this).find('.course-card-top.cart-color span').text(),
                        "course_name": $(this).find('h3').text().replace(/\s*\r\n\s*/g, ''),
                        "course_desc": $(this).find('p').text().replace(/\s*\r\n\s*/g, ''),
                        "course_level": $(this).find('.course-card-info').text().replace(/\s*\r\n\s*/g, '').slice(0, 2),
                        "learned_num": $(this).find('.course-card-info').text().replace(/\s*\r\n\s*/g, '').replace(/[^0-9]/ig, ""),
                        "course_url": ""
                    }
                    console.log("page: " + page_count + ", course index: " + index)
                    console.log("Category    : " + courseItem["course_category"])
                    console.log("Course name : " + courseItem["course_name"])
                    console.log("Course desc : " + courseItem["course_desc"])
                    console.log("Level   : " + courseItem["course_level"])
                    console.log("Num   : " + courseItem["learned_num"])

                    if ($(this).children() && $(this).children()[0].attribs) {
                        var courseUrl = $(this).children()[0].attribs['href']
                        courseItem["course_url"] = baseDomain + courseUrl
                        console.log("Course Url  : " + courseItem["course_url"] + '\n')
                    }

                    //save data to mongodb
                    mongooseModel.create(courseItem, error => {
                        if (error) {
                            console.log(error)
                        } else {
                            console.log('Save ok')
                        }
                    })
                })

                resolve(pageHtml)
            } catch (e) {
                db.close()
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
                page_count++
                crawl_page(nextPageUrl)
            } else {
                db.close()
                console.log('Crawler ends for all courses have been got')
            }

        } catch (e) {
            db.close()
            console.log("Some error happens: " + e)
        }
    })
}

crawl_page(baseUrl)

