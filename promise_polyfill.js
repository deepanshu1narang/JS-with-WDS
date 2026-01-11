console.log("Hello world in promise");

const STATE = {
  FULFILLED: "fulfilled",
  REJECTED: "rejected",
  PENDING: "pending",
};

class MyPromise {
    constructor(callback) {

        if(typeof callback !== 'function')
            throw new TypeError("Promise resolver is not a function");

        try {
            callback(this.#onSuccessBind, this.#onFailBind);
        } catch (e) {
            callback(this.#onFailBind);
        }
    }

    #onSuccessBind = this.#onSuccess.bind(this);
    #onFailBind = this.#onFail.bind(this);
    #state = STATE.PENDING;
    #value;
    // state to remember thens in case of promise chaining
    #thenCallbacks = [];
    #catchCallbacks = [];


    // fucntions
    // private

    #runCallbacks(){
        if(this.#state === STATE.FULFILLED){
            this.#thenCallbacks.forEach(cb => {
                cb(this.#value);
            });

            this.#thenCallbacks = [];
        }

        if(this.#state === STATE.REJECTED){
            this.#catchCallbacks.forEach(cb => {
                cb(this.#value);
            });

            this.#catchCallbacks = [];
        }
    }

    #onSuccess(value) {
        queueMicrotask(() => {
            if(this.#state !== STATE.PENDING)
                return;
            
            if(value instanceof MyPromise){
                value.then(this.#onSuccessBind, this.#onFailBind);
                return;
            }

            this.#value = value;
            this.#state = STATE.FULFILLED;
            this.#runCallbacks();
        });
    }
    
    #onFail(value) {
        queueMicrotask(() => {
            if(this.#state !== STATE.PENDING)
                return;
            
            if(value instanceof MyPromise){
                value.then(this.#onSuccessBind, this.#onFailBind);
                return;
            }

            if(this.#catchCallbacks.length === 0)
                throw new UncaughtPromiseError(value);
            
            this.#value = value;
            this.#state = STATE.REJECTED;
            this.#runCallbacks();
        });
    }
    
    then(thenCb, catchCb) {
        // chaining .... basically our then returns promise (MyPromise)
        return new MyPromise((resolve, reject) => {
            this.#thenCallbacks.push(result => {
                if(!thenCb){
                    resolve(result);
                    return;
                }

                try{
                    resolve(thenCb(result));
                }
                catch(err){
                    reject(err);
                }

            });

            this.#catchCallbacks.push(result => {
                if(!catchCb){
                    reject(result);
                    return;
                }

                try{
                    resolve(catchCb(result));
                }
                catch(err){
                    reject(err);
                }

            });
            
            this.#runCallbacks();
        });
    }
    
    catch(cb) {
        return this.then(undefined, cb);
    }

    finally(cb){
        return this.then(
            val => {
                cb();
                return val;
            },
            err => {
                cb();
                throw err;
            }
        );
    }

    static resolve(value){
        return new MyPromise(resolve => resolve(value));
    }

    static reject(value){
        return new MyPromise((_resolve, reject) => reject(value));
    }

    static all(promises){
        const results = [];
        let completedPromises = 0;

        return new MyPromise((resolve, reject) => {
            for(let i = 0; i < promises.length; i++){
                let promise = promises[i];
                promise.then(value => {
                    completedPromises++;
                    results[i] = value;
                    if(completedPromises === promises.length)
                        resolve(results);
                })
                .catch(reject);
            }
        })
    }

    static allSettled(promises){
        let results = [];
        let completedPromises = 0;

        return new MyPromise((resolve) => {
            for(let i = 0; i < promises.length; i++){
                let promise = promises[i];
                promise.then(value => {
                    results[i] = { value, status: STATE.FULFILLED };
                })
                .catch(reason => {
                    results[i] = { reason, status: STATE.REJECTED};
                })
                .finally(() => {
                    completedPromises++;
                    if(completedPromises === promises.length)
                        resolve(results);
                })
            }
        });
    }

    static race(promises){
        return new MyPromise((resolve, reject) => {
            promises.forEach(p => p.then(resolve)).catch(reject);
        });
    }

    static any(promises){
        return new MyPromise((resolve, reject) => {
            const errors = [];
            let rejectedPromises = 0;
            for(let i = 0; i < promises.length; i++){
                let promise = promises[i];
                promise.then(resolve)
                .catch(error => {
                    rejectedPromises++;
                    errors[i] = error;
                    if(rejectedPromises === promises.length)
                        reject(new AggregateError(errors, "All promises rejected"));
                })
            }
        });
    }
}

class UncaughtPromiseError extends Error{
    constructor(err){
        super(err);
        
        this.stack = `in promise ${err.stack}`;
    }
}

// const p = new MyPromise((resolve, reject) => {
//     resolve("promise resolved");
//     resolve("promise resolved again");
//     resolve("promise resolved again x2");
//     reject("rejected");
//     reject("rejected again");
//     reject("rejected again x2");
// })

// p.then(x => {
//     console.log(x);
//     return `x ${x} again`;
// })
// .then(x => console.log(x));

// p.then(x => {
//     console.log(x);
//     return "hi";
// }).then(x => {
//     console.log(x, "again");
//     throw new Error("is it going to catch");
// }).catch(e => console.log(e, 'err'));

// function foo() {
//   this.x = 10;
// }

// const obj = {};

// const bound = foo.bind(obj);
// // bound();
// let y = new bound();

// console.log(obj.x); //
// console.log(y.x); //

// function Foo() {
//   this.x = 10;
//   return [3,5];
// }

// const a = new Foo();
// console.log(a, "puzzle"); // ?

// const p2 = new MyPromise('asdf');
// p2.catch(e => console.log(e));

// console.log("start");

// new MyPromise((_, reject) => {
//   reject("💥 silent bug");
// });

// console.log("end");

const p1 = new Promise((resolve, reject) => {
  setTimeout(() => resolve("one"), 1000);
});
const p2 = new Promise((resolve, reject) => {
  setTimeout(() => resolve("two"), 2000);
});
const p3 = new Promise((resolve, reject) => {
  setTimeout(() => resolve("three"), 3000);
});
const p4 = new Promise((resolve, reject) => {
  setTimeout(() => resolve("four"), 4000);
});
const p5 = new Promise((resolve, reject) => {
  reject(new Error("reject error 112345"));
});

// Using .catch:
Promise.any([p5])
  .then((values) => {
    console.log(values);
  })
  .catch((error) => {
    console.log(error.message);
  });

// Logs:
// "reject"