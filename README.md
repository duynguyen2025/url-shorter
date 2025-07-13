- [Setup](#setup)
- [Business logic: creating a shortened URL](#business-logic-creating-a-shortened-url)
  - [add the logic to save the shortened URL to a database.](#add-the-logic-to-save-the-shortened-url-to-a-database)
- [Business logic: redirecting a short URL](#business-logic-redirecting-a-short-url)
- [Business logic: Updating and deleting a short URL](#business-logic-updating-and-deleting-a-short-url)
- [Business logic: return list of saved short URLs](#business-logic-return-list-of-saved-short-urls)
- [API key authentication](#api-key-authentication)
- [Unit test](#unit-test)
- [Integration testing](#integration-testing)
- [E2e testing](#e2e-testing)

## Setup

- modules are used to organize your application into functional units.
- They also enable dependency injection, allowing you to inject services into your controllers and other services easily.

## Business logic: creating a shortened URL

- The short URL we create needs to have a short uid (unique identifier). For example, if we create a shortened URL for https://www.google.com, we want the short url to be something like https://my-short-url.com/abc123.
- generating a uid
  `pnpm add nanoid@3`
- Có 3 downsides:
  - it’s tightly coupled to the specific functionality of that method. If you later need to generate UIDs in a different part of your application (e.g., in another service or controller), you’ll end up duplicating code.
  - if change the uid package have to update multiple places in our code where the uid package is used
  - test this method difficult because the uid will be different each time

```js
@Injectable()
export class UrlService {
  create(createUrlDto: CreateUrlDto) {
    const uid = nanoid(10)
    return {
      ...createUrlDto,
      url: `localhost:3000/${uid}`,
    }
  }
}
```

- **Sol**: creating a new service to encapsulate the logic for generating the UID, and then `injecting` that service into the UrlService.
- if you want to use a `service` that comes from ‘outside’ of the module, then you need to import the respective module(module của service đó). Any services which are in the `exports` array will then be available to use in the module.

### add the logic to save the shortened URL to a database.

- add url model

> khi app đang run thì ko db:generate được vì nó ko cho sửa file trong codebase

- DatabaseModule is a global module, meaning you can inject the DatabaseService anywhere in app
- the URL has localhost:3000 hard-coded in. It would be better to dynamically update the URL based on the environment the server is running in (config module)

```js
export class UrlService {
  private host: string

  constructor(
    private readonly uidService: UidService,
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService
  ) { }

  onModuleInit() {
    this.host = this.configService.getOrThrow(`host`);
  }

  async create(createUrlDto: CreateUrlDto) {
    const uid = this.uidService.generate(10)
    const url = await this.databaseService.url.create({
      data: {
        ...createUrlDto,
        url: `${this.host}/${uid}`,
      },
    })
    return url
  }
}
```

- **onModuleInit()** This is called when your NestJS server starts (it happens when the bootstrap() method called from the main.ts file). the server will not start if the environment variable is missing, prompting you to fix the issue before you get a runtime error!

## Business logic: redirecting a short URL

- add the logic so that when someone uses the shortened URL, it fetches the respective record in the database and redirects to the specified URL.
  `GET /:uid`
- Nếu dùng :uid ko hợp lệ? When it comes to validating requests in NestJS, there are two ways to do this:
  - Using Pipes: used to validate the data that’s sent in the request and also transform the data if required. DTO là 1 pipe.
    Có thể dùng để validate the data sent in the request `params`, query `params`, and `headers`.
  - Using Guards: Guards are used to protect routes and endpoints VD: access route base on user role
- we can use a custom pipe to validate the url exists in the database.
  ` nest generate pipe modules/url/pipes/url-exists`

```js
@Injectable()
export class UrlExistsPipe implements PipeTransform {
  constructor(private readonly urlService: UrlService) { }
  async transform(value: string) {
    const url = await this.urlService.findOne(value);
    if (!url) {
      throw new NotFoundException(`URL ${value} does not exist`);
    }
    return url;
  }
}
// controller
  @Get(':uid')
  findOne(@Param('uid', UrlExistsPipe) url: Url, @Res() res: Response) {
    res.redirect(url.redirect)
  }


```

## Business logic: Updating and deleting a short URL

## Business logic: return list of saved short URLs

- Update our GET request to accept a page and limit query parameter.
- We’ll also allow for a filter parameter to search for a specific url.

- adding 2 new DTO files called pagination.dto.ts and get-urls.dto.ts:

```bash
touch src/modules/url/dto/pagination.dto.ts
touch src/modules/url/dto/filter-urls.dto.ts

```

- @Query decorator automatically parses the query parameters into strings. So we need to update the Pagination DTO to transform the strings into integers.

## API key authentication

- We’ve hard-coded in the string SECRET into the guard which isn’t really best practice. Let’s update this to use an environment variable instead.
  `npx nest generate guard auth`

- The @Get(’:uid’) endpoint should be public, so we need to exclude this from the guard.
- apply the guard to all methods except the findOne() method
  `@UseGuards(AuthGuard)`

## Unit test

- Jest ko hiểu alias path. cần config

```json
// package.json
"jest": {
  // ...existing config...
  "moduleNameMapper": {
    "^@/(.*)$": "<rootDir>/$1"
  }
}
// thêm vào jest-e2e.json
```

## Integration testing

- integration tests often care about both the end result and the side effects.
- For example, an integration test for the “create URL” functionality would not only verify that the method returns a valid URL but also that a new URL record has been correctly inserted into the database.

**setup test**

- Before running all the tests, it creates a NestJS runtime with the Test class, importing the AppModule
- Resets both the database and cache after each test
- Exports the app (the NestJS runtime) and server (the HTTP server) so that we can easily use them in our tests

- `url/url.service.int-spec.ts`

## E2e testing

- We’ve tested the service methods but we haven’t tested the API endpoints that call those service methods
- We want to test that the endpoints return the correct status code and response body.
- End-to-end tests are great for:
  - testing the validation layers are working correctly (we have a UrlExistsPipe as well as some DTOs, so it’s good to test that these are working correctly)
  - testing the response of the API endpoints (i.e. the HTTP response code and response body) are what we expect

- Starting with the POST /url request, here are some scenarios worth testing:
  - should return back the created URL
  - should return a 400 if the payload is invalid
  - should return a 401 if the API key is wrong
- `app.e2e-spec.ts`
- `supertest` package
