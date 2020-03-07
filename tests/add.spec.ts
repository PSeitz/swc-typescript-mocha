
import {add} from "../src/add"
import { expect } from "chai";


describe('test', function() {
    this.timeout(20000);
    it('should save without error', function() {
        var result = add(5, 3);
        expect(result).to.equal(8);
    });
});
